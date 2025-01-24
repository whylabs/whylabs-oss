package ai.whylabs.core.calculationsV3;

import static ai.whylabs.core.configV3.structure.enums.AnalysisMetric.count;
import static ai.whylabs.core.configV3.structure.enums.AnalysisMetric.errorMetric;
import static ai.whylabs.core.configV3.structure.enums.AnalysisMetric.histogram;
import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.is;
import static org.testng.Assert.*;

import ai.whylabs.core.aggregation.ChartMetadata;
import ai.whylabs.core.calculationsV3.results.CalculationResult;
import ai.whylabs.core.calculationsV3.results.StddevCalculationResult;
import ai.whylabs.core.configV3.structure.Analyzer;
import ai.whylabs.core.configV3.structure.Analyzers.AnalyzerConfig;
import ai.whylabs.core.configV3.structure.Baselines.Baseline;
import ai.whylabs.core.configV3.structure.Baselines.TrailingWindowBaseline;
import ai.whylabs.core.configV3.structure.CronSchedule;
import ai.whylabs.core.configV3.structure.DatasetMatrix;
import ai.whylabs.core.configV3.structure.MonitorConfigV3;
import ai.whylabs.core.configV3.structure.Segment;
import ai.whylabs.core.configV3.structure.enums.AnalysisMetric;
import ai.whylabs.core.configV3.structure.enums.Granularity;
import ai.whylabs.core.structures.ExplodedRow;
import ai.whylabs.core.structures.QueryResultStructure;
import ai.whylabs.core.structures.monitor.events.AnalyzerResult;
import ai.whylabs.core.structures.monitor.events.FailureType;
import com.shaded.whylabs.org.apache.datasketches.kll.KllFloatsSketch;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.IntStream;
import lombok.val;
import org.apache.commons.lang3.tuple.Pair;
import org.apache.commons.math3.stat.descriptive.DescriptiveStatistics;
import org.testng.annotations.BeforeTest;
import org.testng.annotations.Test;

public class BaseCalculationV3Test {
  static final double[] values = {
    89119.0, 117282.0, 78701.0, 63456.0, 63731.0, 78161.0, 78581.0, 97605.0, 122480.0, 73446.0,
    50475.0, 54593.0, 58734.0, 69682.0, 90665.0, 118782.0, 81981.0, 67113.0, 68746.0, 71977.0,
  };

  public class TestConfig implements AnalyzerConfig {

    @Override
    public TestCalculation toCalculation(
        MonitorConfigV3 monitorConfigV3, boolean overwriteEvents, Analyzer analyzer) {
      return new TestCalculation(monitorConfigV3, analyzer);
    }

    public Baseline getBaseline() {
      return TrailingWindowBaseline.builder().size(7).build();
    }

    @Override
    public Integer getVersion() {
      return 1;
    }

    @Override
    public Algorithm getAlgorithm() {
      return null;
    }

    @Override
    public String getAnalyzerType() {
      return null;
    }

    @Override
    public String getAlgorithmMode() {
      return null;
    }

    @Override
    public String getMetric() {
      return null;
    }
  }

  class TestCalculationResult implements CalculationResult {

    @Override
    public void populate(AnalyzerResult.AnalyzerResultBuilder builder) {}

    @Override
    public Long getAlertCount() {
      return 0l;
    }
  }

  class TestCalculation extends BaseCalculationV3<Double, StddevCalculationResult> {

    public TestCalculation(MonitorConfigV3 monitorConfigV3, Analyzer analyzer) {
      super(monitorConfigV3, analyzer, true);
    }

    @Override
    public Function<AnalyzerResult, CalculationResult> getPreviousResultTransformer() {
      return new Function<AnalyzerResult, CalculationResult>() {
        @Override
        public CalculationResult apply(AnalyzerResult analyzerResult) {
          return StddevCalculationResult.builder().build();
        }
      };
    }

    @Override
    public boolean renderAnomalyChart(
        ChartMetadata metadata, List<Pair<Long, CalculationResult>> results, String path) {
      return false;
    }

    @Override
    public TestCalculationResult calculate(
        List<Pair<Long, Double>> baseline,
        List<Pair<Long, Double>> target,
        List<Pair<Long, CalculationResult>> priorResults) {
      val stats = new DescriptiveStatistics();
      baseline.stream()
          .map(Pair::getValue)
          .forEach(stats::addValue); // will cause exception for baseline types other than Double

      return null; // this will cause exception later.
    }

    @Override
    public boolean requireRollup() {
      return false;
    }
  }

  public MonitorConfigV3 mkMonitorConfig(AnalysisMetric metric) {
    List<Analyzer> analyzers = new ArrayList<>();
    TrailingWindowBaseline baseline = TrailingWindowBaseline.builder().size(7).build();
    Segment overall = Segment.builder().build();

    analyzers.add(
        Analyzer.builder()
            .id("testing")
            .disabled(false)
            .config(new TestConfig())
            .tags(Arrays.asList("llm"))
            .targetMatrix(
                DatasetMatrix.builder().segments(Collections.singletonList(overall)).build())
            .schedule(CronSchedule.builder().cron("0 * * * *").build())
            .build());

    return MonitorConfigV3.builder().granularity(Granularity.daily).analyzers(analyzers).build();
  }

  private List<QueryResultStructure> baseline;
  private QueryResultStructure target;

  // generate a KllFloatsSketch over pseudo-random numbers.
  // used to generate histogram sketch to provoke incompatible type exceptions in monitor
  // calculations
  private static KllFloatsSketch mkSketch(int seed) {
    val s = new KllFloatsSketch();
    new Random(seed).doubles(5, 0, 30).forEach(d -> s.update((float) d));
    return s;
  }

  @BeforeTest
  public void setup() {
    baseline =
        IntStream.range(0, values.length)
            .mapToObj(
                i ->
                    new QueryResultStructure(
                        ExplodedRow.builder()
                            .missing(Boolean.FALSE)
                            .ts((long) i)
                            .histogram(mkSketch(i).toByteArray())
                            .counters_count((long) values[i])
                            .weight(.1)
                            .build(),
                        null))
            .collect(Collectors.toList());

    target =
        new QueryResultStructure(
            ExplodedRow.builder()
                .ts((long) values.length + 1)
                .weight(.1)
                .counters_count((long) values[5])
                .build(),
            null);
  }

  // assert MetricException failure generated when metric throws exception.
  @Test
  public void testMetricException() {
    MonitorConfigV3 monitorConfig = mkMonitorConfig(errorMetric); // generates exception!
    BaseCalculationV3 calculation =
        monitorConfig
            .getAnalyzers()
            .get(0)
            .getConfig()
            .toCalculation(monitorConfig, true, monitorConfig.getAnalyzers().get(0));

    AnalyzerResult result =
        calculation.run(
            baseline,
            null,
            target,
            Arrays.asList(target),
            target,
            baseline.size(),
            "testing",
            null,
            null,
            0l);

    // concentrating on asserting values determined by the stddev calculation itself
    assertThat(result.getFailureType(), is(FailureType.MetricException));
    assertThat(result.getDisableTargetRollup(), is(false));
    assertNotNull(result.getFailureExplanation());
  }

  @Test
  public void testDisableTargetRollup() {
    MonitorConfigV3 monitorConfig = mkMonitorConfig(errorMetric); // generates exception!
    monitorConfig.getAnalyzers().get(0).setDisableTargetRollup(true);
    BaseCalculationV3 calculation =
        monitorConfig
            .getAnalyzers()
            .get(0)
            .getConfig()
            .toCalculation(monitorConfig, true, monitorConfig.getAnalyzers().get(0));

    AnalyzerResult result =
        calculation.run(
            baseline,
            null,
            target,
            Arrays.asList(target),
            target,
            baseline.size(),
            "testing",
            null,
            null,
            0l);

    // concentrating on asserting values determined by the stddev calculation itself
    assertThat(result.getDisableTargetRollup(), is(true));
  }

  // assert CalculationError failure (ClassCastException) generated when metric type is incompatible
  // with calculation type.
  @Test
  public void testIncompatibleCalculationException() {
    // `histogram` metric is incompatible with stddev(Double) calculation.
    MonitorConfigV3 monitorConfig = mkMonitorConfig(histogram);
    BaseCalculationV3 calculation =
        monitorConfig
            .getAnalyzers()
            .get(0)
            .getConfig()
            .toCalculation(monitorConfig, true, monitorConfig.getAnalyzers().get(0));

    AnalyzerResult result =
        calculation.run(
            baseline,
            null,
            target,
            Arrays.asList(target),
            target,
            baseline.size(),
            "testing",
            null,
            null,
            0l);
    assertTrue(result.getAnalyzerTags().contains("llm"));

    // concentrating on asserting values determined by the stddev calculation itself
    assertThat(result.getFailureType(), is(FailureType.MetricException));
    assertNotNull(result.getFailureExplanation());
  }

  // assert CalculationError failure when calculation fails to generate a result.
  @Test
  public void testNullCalculationResult() {
    // `count` metric is compatible with stddev(Double) calculation,
    // but the calculation is implemented to return null.  Expect an error.
    val monitorConfig = mkMonitorConfig(count);
    val calculation =
        monitorConfig
            .getAnalyzers()
            .get(0)
            .getConfig()
            .toCalculation(monitorConfig, true, monitorConfig.getAnalyzers().get(0));

    AnalyzerResult result =
        calculation.run(
            baseline,
            null,
            target,
            Arrays.asList(target),
            target,
            baseline.size(),
            "testing",
            null,
            null,
            0l);

    // concentrating on asserting values determined by the stddev calculation itself
    assertThat(result.getFailureType(), is(FailureType.MetricException));
    assertNotNull(result.getFailureExplanation());
  }
}
