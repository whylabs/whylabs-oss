package ai.whylabs.core.calculationsV3;

import static ai.whylabs.core.configV3.structure.Analyzers.ConditionalLimitType.conjunction;
import static ai.whylabs.core.configV3.structure.enums.AnalysisMetric.count;
import static java.lang.Double.NaN;
import static java.util.Objects.nonNull;
import static org.hamcrest.CoreMatchers.equalTo;
import static org.hamcrest.CoreMatchers.not;
import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.containsStringIgnoringCase;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.number.IsCloseTo.closeTo;
import static org.hamcrest.number.OrderingComparison.greaterThan;
import static org.testng.Assert.*;

import ai.whylabs.core.calculationsV3.results.CalculationResult;
import ai.whylabs.core.calculationsV3.results.StddevCalculationResult;
import ai.whylabs.core.configV3.structure.*;
import ai.whylabs.core.configV3.structure.Analyzers.StddevConfig;
import ai.whylabs.core.configV3.structure.Analyzers.ThresholdType;
import ai.whylabs.core.configV3.structure.Baselines.TrailingWindowBaseline;
import ai.whylabs.core.configV3.structure.enums.Granularity;
import ai.whylabs.core.serde.MonitorConfigV3JsonSerde;
import ai.whylabs.core.structures.ExplodedRow;
import ai.whylabs.core.structures.QueryResultStructure;
import ai.whylabs.core.structures.monitor.events.AnalyzerResult;
import ai.whylabs.core.structures.monitor.events.FailureType;
import com.google.common.collect.ImmutableMap;
import java.io.File;
import java.io.PrintWriter;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.*;
import lombok.SneakyThrows;
import lombok.val;
import org.apache.commons.lang3.ArrayUtils;
import org.apache.commons.lang3.tuple.Pair;
import org.testng.annotations.Test;

public class StddevCalculationTest {
  static final double[] values = {
    89119.0, 117282.0, 78701.0, 63456.0, 63731.0, 78161.0, 78581.0, 97605.0, 122480.0, 73446.0,
    50475.0, 54593.0, 58734.0, 69682.0, 90665.0, 118782.0, 81981.0, 67113.0, 68746.0, 71977.0,
  };

  /** Assert happy path produces expected thresholds */
  @Test
  public void testHappyPath() {
    StddevConfig config = StddevConfig.builder().factor(2.0).minBatchSize(7).build();
    StddevCalculation calc = new StddevCalculation(null, null, true, config);
    List<Pair<Long, Double>> baseline =
        Arrays.stream(values).mapToObj(v -> Pair.of(0L, v)).collect(Collectors.toList());
    List<Pair<Long, Double>> target =
        DoubleStream.of(1.0).mapToObj(v -> Pair.of(0L, v)).collect(Collectors.toList());

    StddevCalculationResult result = calc.calculate(baseline, target, null);
    assertThat(result.getUpperThreshold(), greaterThan(result.getLowerThreshold()));
    assertThat(result.getLowerThreshold(), closeTo(38141.45968168091, 0.01));
    assertThat(result.getUpperThreshold(), closeTo(121389.54031831908, 0.01));
    assertEquals(result.getAlertCount().longValue(), 1L);
  }

  /**
   * Assert that `minBatchSize` configuration is respected.
   *
   * <p>This is a BOGUS test - the actual effect of `minBatchSize` in production is to generate an
   * event with a FailureType=InsufficientBaseline. Instead this test forces the stddev calculation
   * to generate a runtime exception only seen when a baseline is pared down due to null-exclusion
   * or outlier removal.
   */
  @Test(
      expectedExceptions = {RuntimeException.class},
      expectedExceptionsMessageRegExp = ".*requires at least.*")
  public void testShortBaseline() {
    StddevConfig config = StddevConfig.builder().factor(2.9).minBatchSize(30).build();
    StddevCalculation calc = new StddevCalculation(null, null, true, config);
    List<Pair<Long, Double>> baseline =
        Arrays.stream(values).mapToObj(v -> Pair.of(0L, v)).collect(Collectors.toList());
    List<Pair<Long, Double>> target =
        DoubleStream.of(1.0).mapToObj(v -> Pair.of(0L, v)).collect(Collectors.toList());

    val result = calc.calculate(baseline, target, null);
    // expect exception
  }

  /** Assert a baseline containing Null produces real thresholds */
  @Test
  public void testIgnoreNull() {
    StddevConfig config = StddevConfig.builder().factor(2.0).minBatchSize(7).build();
    StddevCalculation calc = new StddevCalculation(null, null, true, config);
    List<Pair<Long, Double>> baseline =
        Arrays.stream(values).mapToObj(v -> Pair.of(0L, v)).collect(Collectors.toList());
    baseline.set(5, Pair.of(0L, null));
    baseline.set(15, Pair.of(0L, null));
    List<Pair<Long, Double>> target =
        DoubleStream.of(1.0).mapToObj(v -> Pair.of(0L, v)).collect(Collectors.toList());

    StddevCalculationResult result = calc.calculate(baseline, target, null);
    assertThat(result.getUpperThreshold(), greaterThan(result.getLowerThreshold()));
    assertThat(result.getLowerThreshold(), closeTo(38199.0290070838, 0.01));
    assertThat(result.getUpperThreshold(), closeTo(117175.08210402733, 0.01));
    assertEquals(result.getAlertCount().longValue(), 1L);
  }

  /** Assert a baseline containing NaN produces non-NaN thresholds */
  @Test
  public void testIgnoreNaN() {
    StddevConfig config = StddevConfig.builder().factor(2.0).minBatchSize(7).build();
    StddevCalculation calc = new StddevCalculation(null, null, true, config);
    List<Pair<Long, Double>> baseline =
        Arrays.stream(ArrayUtils.insert(5, values, NaN, NaN))
            .mapToObj(v -> Pair.of(0L, v))
            .collect(Collectors.toList());
    List<Pair<Long, Double>> target =
        DoubleStream.of(1.0).mapToObj(v -> Pair.of(0L, v)).collect(Collectors.toList());

    StddevCalculationResult result = calc.calculate(baseline, target, null);
    assertThat(result.getUpperThreshold(), greaterThan(result.getLowerThreshold()));
    assertThat(result.getLowerThreshold(), closeTo(38141.45968168091, 0.01));
    assertThat(result.getUpperThreshold(), closeTo(121389.54031831908, 0.01));
    assertEquals(result.getAlertCount().longValue(), 1L);
  }

  /** Assert single reference profile produces valid thresholds */
  @Test
  public void testSingleReference() {
    val config = StddevConfig.builder().factor(2.0).minBatchSize(1).build();
    val calc = new StddevCalculation(null, null, true, config);
    val baseline = DoubleStream.of(5.0).mapToObj(v -> Pair.of(0L, v)).collect(Collectors.toList());
    val target = DoubleStream.of(1.0).mapToObj(v -> Pair.of(0L, v)).collect(Collectors.toList());

    val result = calc.calculate(baseline, target, null);
    assertThat(result.getUpperThreshold(), greaterThan(result.getLowerThreshold()));
    assertThat(result.getLowerThreshold(), closeTo(0.5278640450004204, 0.01));
    assertThat(result.getUpperThreshold(), closeTo(9.47213595499958, 0.01));
    assertEquals(result.getAlertCount().longValue(), 0L);
  }

  /** test if calculation can produce a complete monitor event */
  @Test
  public void testMonitorEvent() {
    MonitorConfigV3 monitorConfig = mkMonitorConfig();
    BaseCalculationV3 calculation =
        monitorConfig
            .getAnalyzers()
            .get(0)
            .getConfig()
            .toCalculation(monitorConfig, true, monitorConfig.getAnalyzers().get(0));

    List<QueryResultStructure> baseline =
        IntStream.range(0, values.length)
            .mapToObj(
                i ->
                    new QueryResultStructure(
                        ExplodedRow.builder()
                            .missing(Boolean.FALSE)
                            .ts((long) i)
                            .weight(.1)
                            .counters_count((long) values[i])
                            .build(),
                        null))
            .collect(Collectors.toList());

    QueryResultStructure target =
        new QueryResultStructure(
            ExplodedRow.builder()
                .ts((long) values.length + 1)
                .counters_count((long) values[5])
                .weight(.1)
                .build(),
            null);

    AnalyzerResult result =
        calculation.run(
            baseline,
            null,
            target,
            Arrays.asList(target),
            target,
            values.length,
            "testing",
            null,
            null,
            0l);

    // concentrating on asserting values determined by the stddev calculation itself
    assertThat(result.getBaselineCount(), is(Long.valueOf(values.length)));
    assertThat(result.getExpectedBaselineCount(), is(7L));
    assertThat(result.getThreshold_calculatedLower(), closeTo(38141.45968168091, 0.01));
    assertThat(result.getThreshold_calculatedUpper(), closeTo(121389.54031831908, 0.01));
  }

  /*
   * test whether stddev analyzer MinBatchSize is being properly defaulted to 3 batches,
   * and generates InsufficientBaseline event errors.
   */
  @Test
  public void testDefaultMinBatchSize() {
    // analyzers created with Builders have different defaults - use json to mimic production
    // behavior.
    String json =
        "{\n"
            + "  \"id\": \"stddev-test\",\n"
            + "  \"orgId\": \"org-11\",\n"
            + "  \"datasetId\": \"model-0\",\n"
            + "  \"granularity\": \"daily\",\n"
            + "  \"analyzers\": [\n"
            + "    {\n"
            + "      \"id\": \"stddev-test-analyzer\",\n"
            + "      \"targetMatrix\": {\n"
            + "        \"type\": \"column\",\n"
            + "        \"include\": [\n"
            + "          \"*\"\n"
            + "        ]\n"
            + "      },\n"
            + "      \"config\": {\n"
            + "        \"version\": 1,\n"
            + "        \"type\": \"stddev\",\n"
            + "        \"metric\": \"count\",\n"
            + "        \"baseline\": {\n"
            + "          \"type\": \"TrailingWindow\",\n"
            + "          \"size\": 7\n"
            + "        }\n"
            + "      }\n"
            + "    }\n"
            + "  ]\n"
            + "}";

    // Testing default behavior when MinBatchSize is NOT specified.
    // Make sure json config does not contain MinBatchSize.
    assertThat(json, not(containsStringIgnoringCase("MinBatchSize")));

    val monitorConfig = MonitorConfigV3JsonSerde.parseMonitorConfigV3(json);

    // NOTE: config.baseline must not be null, or isSuppressed() will silently ignore MinBatchSize.
    // That seems like buggy behavior.
    assertNotNull(monitorConfig.getAnalyzers().get(0).getConfig().getBaseline());

    // make sure a default value was supplied.
    assertThat(monitorConfig.getAnalyzers().get(0).getConfig().getMinBatchSize(), is(3));

    BaseCalculationV3 calc =
        monitorConfig
            .getAnalyzers()
            .get(0)
            .getConfig()
            .toCalculation(monitorConfig, true, monitorConfig.getAnalyzers().get(0));

    // NOTE: This test could call calc.calculate() like a lot of other unit tests, but that would
    // not generate
    // InsufficientBaseline events.  Must assemble more complex baseline and call calc.run() to get
    // InsufficientBaseline.

    // We just need 3 values in baseline to get correct result.
    List<QueryResultStructure> fullbaseline =
        IntStream.range(0, 3)
            .mapToObj(
                i ->
                    new QueryResultStructure(
                        ExplodedRow.builder()
                            .missing(Boolean.FALSE)
                            .ts((long) i)
                            .weight(.1)
                            .counters_count((long) values[i])
                            .build(),
                        null))
            .collect(Collectors.toList());

    QueryResultStructure target =
        new QueryResultStructure(
            ExplodedRow.builder()
                .ts((long) values.length + 1)
                .counters_count((long) values[5])
                .weight(.1)
                .build(),
            null);

    // first calculation should succeed with 3 baseline values.
    // Subsequent calls to .run with shorter baselines should all generate failure events.
    for (int l = fullbaseline.size(); l >= 0; l--) {
      // baseline gets shorter by one timepoint each time through this loop
      val baseline = fullbaseline.subList(0, l);
      val result =
          calc.run(
              baseline,
              null,
              target,
              Arrays.asList(target),
              target,
              values.length,
              "testing",
              null,
              null,
              0l);
      if (l >= 3) assertNull(result.getFailureType());
      else assertThat(result.getFailureType(), is(FailureType.InsufficientBaseline));
    }
  }

  private static MonitorConfigV3 mkMonitorConfig() {
    List<Analyzer> analyzers = new ArrayList<>();
    val baseline = TrailingWindowBaseline.builder().size(7).build();
    val overall = Segment.builder().build();

    for (val metric : Arrays.asList(count)) {
      analyzers.add(
          Analyzer.builder()
              .id("model_performance")
              .disabled(false)
              .config(
                  StddevConfig.builder()
                      .metric(metric.name())
                      .baseline(baseline)
                      .factor(2.0)
                      .minBatchSize(7)
                      .build())
              .targetMatrix(DatasetMatrix.builder().segments(Arrays.asList(overall)).build())
              .schedule(CronSchedule.builder().cron("0 * * * *").build())
              .build());
    }
    return MonitorConfigV3.builder().granularity(Granularity.daily).analyzers(analyzers).build();
  }

  /** test Grubb outlier support */
  @Test
  public void testOutlierElimination() {
    StddevConfig config =
        StddevConfig.builder()
            .factor(2.0)
            .minBatchSize(7)
            .params(Collections.singletonMap("enableGrubb", "true"))
            .build();
    StddevCalculation calc = new StddevCalculation(null, null, true, config);

    List<Pair<Long, Double>> baseline =
        Arrays.stream(values).mapToObj(v -> Pair.of(0L, v)).collect(Collectors.toList());
    List<Pair<Long, Double>> target =
        DoubleStream.of(1.0).mapToObj(v -> Pair.of(0L, v)).collect(Collectors.toList());

    // assert Grubb does not affect results if no outliers
    StddevCalculationResult result = calc.calculate(baseline, target, null);
    assertThat(result.getUpperThreshold(), greaterThan(result.getLowerThreshold()));
    assertThat(result.getLowerThreshold(), closeTo(38141.45968168091, 0.01));
    assertThat(result.getUpperThreshold(), closeTo(121389.54031831908, 0.01));
    assertEquals(result.getAlertCount().longValue(), 1L);

    // assert Grubb can eliminate outlier, leaving results unaffected
    baseline.add(Pair.of(0L, 20.0 * Math.pow(10.0D, 6)));
    result = calc.calculate(baseline, target, null);
    assertThat(result.getUpperThreshold(), greaterThan(result.getLowerThreshold()));
    assertThat(result.getLowerThreshold(), closeTo(38141.45968168091, 0.01));
    assertThat(result.getUpperThreshold(), closeTo(121389.54031831908, 0.01));
    assertEquals(result.getAlertCount().longValue(), 1L);

    // assert Grubb can eliminate multiple outliers, leaving results unaffected
    baseline.add(3, Pair.of(0L, -20.0 * Math.pow(10.0D, 6)));
    baseline.add(3, Pair.of(0L, 10.0 * Math.pow(10.0D, 6)));
    result = calc.calculate(baseline, target, null);
    assertThat(result.getUpperThreshold(), greaterThan(result.getLowerThreshold()));
    assertThat(result.getLowerThreshold(), closeTo(38141.45968168091, 0.01));
    assertThat(result.getUpperThreshold(), closeTo(121389.54031831908, 0.01));
    assertEquals(result.getAlertCount().longValue(), 1L);
  }

  @Test
  public void testThresholdDirection() {
    StddevConfig config;
    StddevCalculation calc;
    StddevCalculationResult result;

    List<Pair<Long, Double>> baseline =
        Arrays.stream(values).mapToObj(v -> Pair.of(0L, v)).collect(Collectors.toList());
    List<Pair<Long, Double>> target =
        DoubleStream.of(1.0).mapToObj(v -> Pair.of(0L, v)).collect(Collectors.toList());

    // monitor threshold in both directions should  result in alert
    config = StddevConfig.builder().factor(2.0).minBatchSize(7).build();
    calc = new StddevCalculation(null, null, true, config);
    result = calc.calculate(baseline, target, null);
    assertThat(result.getUpperThreshold(), greaterThan(result.getLowerThreshold()));
    assertThat(result.getLowerThreshold(), closeTo(38141.45968168091, 0.01));
    assertThat(result.getUpperThreshold(), closeTo(121389.54031831908, 0.01));
    assertThat(result.getValue(), closeTo(1.0, 0.01));
    assertEquals(result.getAlertCount().longValue(), 1L);

    //  single-sided test on the lower side should also alert.
    config =
        StddevConfig.builder()
            .factor(2.0)
            .minBatchSize(7)
            .thresholdType(ThresholdType.lower)
            .build();
    calc = new StddevCalculation(null, null, true, config);
    result = calc.calculate(baseline, target, null);
    assertThat(result.getUpperThreshold(), greaterThan(result.getLowerThreshold()));
    assertThat(result.getLowerThreshold(), closeTo(38141.45968168091, 0.01));
    assertThat(result.getUpperThreshold(), closeTo(121389.54031831908, 0.01));
    assertThat(result.getValue(), closeTo(1.0, 0.01));
    assertEquals(result.getAlertCount().longValue(), 1L);

    // metric value is far below calculated stddev, so ThresholdType.upper should NOT result in an
    // alert
    config =
        StddevConfig.builder()
            .factor(2.0)
            .minBatchSize(7)
            .thresholdType(ThresholdType.upper)
            .build();
    calc = new StddevCalculation(null, null, true, config);
    result = calc.calculate(baseline, target, null);
    assertThat(result.getUpperThreshold(), greaterThan(result.getLowerThreshold()));
    assertThat(result.getLowerThreshold(), closeTo(38141.45968168091, 0.01));
    assertThat(result.getUpperThreshold(), closeTo(121389.54031831908, 0.01));
    assertThat(result.getValue(), closeTo(1.0, 0.01));
    assertEquals(result.getAlertCount().longValue(), 0L);
  }

  /** generate a pseudo-random double baseline. */
  public List<Pair<Long, Double>> generateBaseline(String start, String end) {
    final LocalDate startDate = LocalDate.parse(start);
    final LocalDate endDate = LocalDate.parse(end);
    final Stream<Long> timeStream =
        Stream.iterate(startDate, d -> d.plusDays(1))
            .limit(ChronoUnit.DAYS.between(startDate, endDate) + 1)
            .map(d -> d.atStartOfDay(ZoneId.of("UTC")).toEpochSecond() * 1000);

    // create our initial baseline, 30 days of data...
    // values have stddev with occasional anomalies
    // generate pseudo-random values with an average of 500 and a standard deviation of 100:
    val r = new Random(100);
    List<Pair<Long, Double>> baseline =
        timeStream
            .map(ts -> Pair.of(ts, r.nextGaussian() * 100 + 500))
            .collect(Collectors.toList());
    return baseline;
  }

  /**
   * Convert analyzer result to CSV row, with columns ["label", "ts", "lower", "upper", "value",
   * "replacement"]
   */
  public String toCSV(Pair<Long, CalculationResult> p) {
    StddevCalculationResult r = ((StddevCalculationResult) p.getValue());
    Stream.Builder<String> builder = Stream.builder();
    builder
        .add(Long.toString(p.getKey()))
        .add(Double.toString(r.getLowerThreshold()))
        .add(Double.toString(r.getUpperThreshold()))
        .add(Double.toString(r.getValue()))
        .add(r.getReplacementValue() == null ? "" : Double.toString(r.getReplacementValue()));
    return builder.build().collect(Collectors.joining(","));
  }

  /**
   * Test whether replacement strategy is generating different results than without replacement.
   *
   * <p>Note use of "seed" parameter to generate repeatable results
   */
  @SneakyThrows
  @Test()
  public void testReplacement() {

    val metricValues = generateBaseline("2023-06-01", "2023-08-30");

    StddevConfig config =
        StddevConfig.builder()
            .metric("test")
            .baseline(TrailingWindowBaseline.builder().size(7).build())
            .factor(1.0)
            .minBatchSize(7)
            .params(ImmutableMap.of("seed", "100"))
            .build();
    StddevCalculation calc = new StddevCalculation(null, null, true, config);
    LinkedList<Pair<Long, CalculationResult>> prior = new LinkedList<>();
    List<Pair<Long, Double>> baseline = new ArrayList<>();
    for (val target : metricValues) {
      val timestamp = target.getKey();
      StddevCalculationResult result = null;
      try {
        result = calc.calculate(baseline, Arrays.asList(target), prior);
      } catch (Exception e) {
        System.out.println(e.getMessage());
      }
      prior.add(Pair.of(timestamp, result));
      baseline.add(target);
    }
    // save results for writing to CSV file
    val withoutReplacement =
        prior.stream()
            .filter(p -> nonNull(p.getValue()))
            .map(this::toCSV)
            .map(s -> "without," + s)
            .collect(Collectors.toList());

    // assert that none of the getReplacementValue are set.
    long count =
        prior.stream()
            .filter(p -> nonNull(p.getValue()))
            .map(p -> p.getValue().getReplacementValue())
            .filter(Objects::nonNull)
            .count();
    assertThat(count, is(0L));

    // now do it again, this time with `enableAnomalyReplacement` to replace prior anomalies.
    config =
        StddevConfig.builder()
            .metric("test")
            .baseline(TrailingWindowBaseline.builder().size(7).build())
            .factor(1.0)
            .minBatchSize(7)
            .params(
                ImmutableMap.of(
                    "seed", "100",
                    "enableAnomalyReplacement", "true"))
            .build();
    calc = new StddevCalculation(null, null, true, config);
    prior.clear();
    baseline.clear();
    for (val target : metricValues) {
      val timestamp = target.getKey();
      StddevCalculationResult result = null;
      try {
        result = calc.calculate(baseline, Arrays.asList(target), prior);
      } catch (Exception e) {
        System.out.println(e.getMessage());
      }
      prior.add(Pair.of(timestamp, result));
      baseline.add(target);
    }
    // assert that some of the getReplacementValue are set.
    count =
        prior.stream()
            .filter(p -> nonNull(p.getValue()))
            .map(p -> p.getValue().getReplacementValue())
            .filter(Objects::nonNull)
            .count();
    assertThat(count, is(37L));

    // save results for writing to CSV file
    val withReplacement =
        prior.stream()
            .filter(p -> nonNull(p.getValue()))
            .map(this::toCSV)
            .map(s -> "with," + s)
            .collect(Collectors.toList());

    // write values to CSV files for plotting in python
    File csvOutputFile = new File("output.csv");
    try (PrintWriter pw = new PrintWriter(csvOutputFile)) {
      withoutReplacement.stream().forEach(pw::println);
      withReplacement.stream().forEach(pw::println);
    }
  }

  /*
   * test roundtrip copying from StddevCalculationResult -> AnalyzerResult -> CalculationResult.
   * Particularly ensure anomaly replacement values get copied through correctly.
   */
  @Test()
  public void testPreviousResultTransformer() {
    val stdevCalcResult =
        StddevCalculationResult.builder()
            .value(250.0) //
            .upperThreshold(200.0) //
            .lowerThreshold(50.0)
            .absoluteUpper(300.0)
            .absoluteLower(10.0)
            .replacementValue(277.0)
            .alertCount(0L)
            .shouldReplace(true)
            .adjustedPrediction(150.0)
            .lambdaKeep(.2)
            .build();

    AnalyzerResult.AnalyzerResultBuilder builder = AnalyzerResult.builder();
    stdevCalcResult.populate(builder);
    final AnalyzerResult analyzerResult = builder.build();

    StddevConfig config =
        StddevConfig.builder()
            .metric("test")
            .baseline(TrailingWindowBaseline.builder().size(7).build())
            .factor(1.0)
            .minBatchSize(7)
            .params(ImmutableMap.of("seed", "100"))
            .build();
    StddevCalculation stddevCalculation = new StddevCalculation(null, null, true, config);
    val transformer = stddevCalculation.getPreviousResultTransformer();
    final CalculationResult result = transformer.apply(analyzerResult);
    assertThat(result.getShouldReplace(), is(true));
    assertThat(result.getReplacementValue(), is(277.0));
    assertThat(result.getAdjustedPrediction(), is(150.0));
  }

  /** Assert upper path produces expected thresholds */
  @Test
  public void testFixedThresholds() {
    List<Pair<Long, Double>> baseline =
        Arrays.stream(values).mapToObj(v -> Pair.of(0L, v)).collect(Collectors.toList());
    List<Pair<Long, Double>> target =
        DoubleStream.of(90000.0).mapToObj(v -> Pair.of(0L, v)).collect(Collectors.toList());

    StddevConfig config = StddevConfig.builder().factor(2.0).minBatchSize(7).build();
    StddevCalculation calc = new StddevCalculation(null, null, true, config);
    StddevCalculationResult result = calc.calculate(baseline, target, null);
    assertThat(result.getUpperThreshold(), greaterThan(result.getLowerThreshold()));
    assertThat(result.getLowerThreshold(), closeTo(38141.45968168091, 0.01));
    assertThat(result.getUpperThreshold(), closeTo(121389.54031831908, 0.01));
    assertEquals(result.getAlertCount().longValue(), 0L);

    // maxUpperThreshold causes alert if exceeded
    config = StddevConfig.builder().factor(2.0).minBatchSize(7).maxUpperThreshold(80000.0).build();
    calc = new StddevCalculation(null, null, true, config);
    result = calc.calculate(baseline, target, null);
    assertThat(result.getLowerThreshold(), closeTo(38141.45968168091, 0.01));
    assertThat(result.getUpperThreshold(), closeTo(80000.0, 0.01));
    assertEquals(result.getAlertCount().longValue(), 1L);

    // maxUpperThreshold does not affect results if not exceeded.
    config = StddevConfig.builder().factor(2.0).minBatchSize(7).maxUpperThreshold(130000.0).build();
    calc = new StddevCalculation(null, null, true, config);
    result = calc.calculate(baseline, target, null);
    assertThat(result.getLowerThreshold(), closeTo(38141.45968168091, 0.01));
    assertThat(result.getUpperThreshold(), closeTo(121389.54031831908, 0.01));
    assertThat(result.getAbsoluteUpper(), closeTo(130000.0, 0.01));
    assertEquals(result.getAlertCount().longValue(), 0L);

    // minLowerThreshold does not affect results if not exceeded.
    config = StddevConfig.builder().factor(2.0).minBatchSize(7).minLowerThreshold(20000.0).build();
    calc = new StddevCalculation(null, null, true, config);
    result = calc.calculate(baseline, target, null);
    assertThat(result.getLowerThreshold(), closeTo(38141.45968168091, 0.01));
    assertThat(result.getUpperThreshold(), closeTo(121389.54031831908, 0.01));
    assertThat(result.getAbsoluteLower(), closeTo(20000.0, 0.01));
    assertEquals(result.getAlertCount().longValue(), 0L);

    // limitType==conjunction, alert only if target exceeds stddev, AND exceeds maxUpperThreshold
    // in this case 2*stddev < 122000(target) < 130000.0, no alert
    target = DoubleStream.of(122000D).mapToObj(v -> Pair.of(0L, v)).collect(Collectors.toList());
    config =
        StddevConfig.builder()
            .factor(2.0)
            .minBatchSize(7)
            .limitType(conjunction)
            .maxUpperThreshold(130000.0)
            .build();
    calc = new StddevCalculation(null, null, true, config);
    result = calc.calculate(baseline, target, null);
    assertThat(result.getLowerThreshold(), equalTo(Double.NEGATIVE_INFINITY));
    assertThat(result.getUpperThreshold(), closeTo(130000.0, 0.01));
    assertThat(result.getAbsoluteLower(), equalTo(Double.NEGATIVE_INFINITY));
    assertThat(result.getAbsoluteUpper(), closeTo(130000.0, 0.01));
    assertEquals(result.getAlertCount().longValue(), 0L);

    // limitType==conjunction, alert only if target exceeds stddev, AND exceeds maxUpperThreshold
    // in this case 2*stddev < 80000.0 (maxUpperThreshold) < 122000(target) , yes alert
    config =
        StddevConfig.builder()
            .factor(2.0)
            .minBatchSize(7)
            .limitType(conjunction)
            .maxUpperThreshold(80000.0)
            .build();
    calc = new StddevCalculation(null, null, true, config);
    result = calc.calculate(baseline, target, null);
    assertThat(result.getLowerThreshold(), equalTo(Double.NEGATIVE_INFINITY));
    assertThat(result.getUpperThreshold(), closeTo(121389.54031831908, 0.01));
    assertThat(result.getAbsoluteLower(), equalTo(Double.NEGATIVE_INFINITY));
    assertThat(result.getAbsoluteUpper(), closeTo(80000.0, 0.01));
    assertEquals(result.getAlertCount().longValue(), 1L);
  }
}
