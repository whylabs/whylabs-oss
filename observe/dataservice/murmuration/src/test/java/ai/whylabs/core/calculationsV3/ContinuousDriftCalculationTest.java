package ai.whylabs.core.calculationsV3;

import static ai.whylabs.core.configV3.structure.Analyzers.DriftConfig.Algorithm.hellinger;
import static java.util.stream.Collectors.toList;
import static org.hamcrest.MatcherAssert.assertThat;
import static org.testng.Assert.*;

import ai.whylabs.core.aggregation.BaselineRoller;
import ai.whylabs.core.configV3.structure.Analyzer;
import ai.whylabs.core.configV3.structure.Analyzers.DriftConfig;
import ai.whylabs.core.configV3.structure.ColumnMatrix;
import ai.whylabs.core.configV3.structure.MonitorConfigV3;
import ai.whylabs.core.configV3.structure.enums.AnalysisMetric;
import ai.whylabs.core.configV3.structure.enums.Granularity;
import ai.whylabs.core.structures.ExplodedRow;
import ai.whylabs.core.structures.QueryResultStructure;
import ai.whylabs.core.structures.monitor.events.AnalyzerResult;
import com.shaded.whylabs.org.apache.datasketches.kll.KllDoublesSketch;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.util.Arrays;
import java.util.Random;
import java.util.stream.IntStream;
import lombok.val;
import org.apache.commons.lang3.tuple.Pair;
import org.hamcrest.number.IsCloseTo;
import org.testng.annotations.Test;

public class ContinuousDriftCalculationTest {

  // generate a KllDoublesSketch over pseudo-random numbers.
  private static KllDoublesSketch mkSketch(int seed) {
    val s = new KllDoublesSketch(1024);
    new Random(seed).doubles(5, 0, 30).forEach(d -> s.update((float) d));
    return s;
  }

  @Test
  public void testExpectRolledUpBaselineCalculate() {
    val config = DriftConfig.builder().build();
    val calc = new ContinuousDriftCalculation(null, null, true, config);
    Integer foo;
    val baseline =
        IntStream.range(0, 5).mapToObj(i -> mkSketch(i)).map(v -> Pair.of(0L, v)).collect(toList());
    val target =
        IntStream.range(0, 1).mapToObj(i -> mkSketch(i)).map(v -> Pair.of(0L, v)).collect(toList());

    val result = calc.calculate(baseline, target, null);
    assertNull(result); // fails because baseline is too long.
  }

  @Test
  public void testCalculateNoAlert() {
    val config = DriftConfig.builder().threshold(1.0).build();
    val calc = new ContinuousDriftCalculation(null, null, true, config);
    val baseline =
        IntStream.range(0, 1).mapToObj(i -> mkSketch(i)).map(v -> Pair.of(0L, v)).collect(toList());
    val target =
        IntStream.range(300, 301)
            .mapToObj(i -> mkSketch(i))
            .map(v -> Pair.of(0L, v))
            .collect(toList());

    val result = calc.calculate(baseline, target, null);
    assertThat(result.getMetricValue(), IsCloseTo.closeTo(0.8468513963650179, 0.01));
    assertEquals(result.getAlertCount().longValue(), 0L);
  }

  @Test
  public void testCalculateAlert() {
    val config = DriftConfig.builder().threshold(.5).build();
    val calc = new ContinuousDriftCalculation(null, null, true, config);

    val baseline =
        IntStream.range(0, 1)
            .mapToObj(ContinuousDriftCalculationTest::mkSketch)
            .map(v -> Pair.of(0L, v))
            .collect(toList());
    val target =
        IntStream.range(300, 301)
            .mapToObj(ContinuousDriftCalculationTest::mkSketch)
            .map(v -> Pair.of(0L, v))
            .collect(toList());

    val result = calc.calculate(baseline, target, null);
    assertThat(result.getMetricValue(), IsCloseTo.closeTo(0.8468513963650179, 0.01));
    assertEquals(result.getAlertCount().longValue(), 1L);
  }

  // We shouldn't run calculations on days without any targets present
  @Test
  public void testSuppressMissingTarget() {
    val config = DriftConfig.builder().threshold(.5).build();
    val analyzer =
        Analyzer.builder()
            .id("abcd")
            .targetMatrix(ColumnMatrix.builder().include(Arrays.asList("*")).build())
            .config(
                DriftConfig.builder()
                    .algorithm(hellinger)
                    .metric(AnalysisMetric.frequent_items.name())
                    .build())
            .build();
    val conf = MonitorConfigV3.builder().granularity(Granularity.daily).build();
    val calc = new ContinuousDriftCalculation(conf, analyzer, true, config);

    QueryResultStructure baseline =
        new QueryResultStructure(
            ExplodedRow.builder().orgId("a").missing(false).datasetId("b").build(), null);
    QueryResultStructure target =
        new QueryResultStructure(
            ExplodedRow.builder().orgId("a").missing(true).datasetId("b").build(), null);
    Long targetBatchTimestamp = 1646352000000l;
    val dt = ZonedDateTime.ofInstant(Instant.ofEpochMilli(targetBatchTimestamp), ZoneOffset.UTC);
    AnalyzerResult result =
        calc.run(
            Arrays.asList(baseline),
            new BaselineRoller(baseline),
            target,
            Arrays.asList(target),
            target,
            targetBatchTimestamp,
            "abcd",
            null,
            dt,
            0l);
    assertNull(result);
  }
}
