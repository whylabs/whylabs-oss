package ai.whylabs.core.calculationsV3;

import static org.junit.Assert.assertEquals;

import ai.whylabs.core.configV3.structure.Analyzer;
import ai.whylabs.core.configV3.structure.Analyzers.MonotonicCalculationConfig;
import ai.whylabs.core.configV3.structure.enums.MonotonicDirection;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import lombok.val;
import org.apache.commons.lang3.tuple.Pair;
import org.testng.annotations.Test;

public class MonotonicCalculationTest {
  @Test
  public void test() {
    val a = new Analyzer();
    a.setConfig(MonotonicCalculationConfig.builder().metric("unique_lower").build());

    val c =
        MonotonicCalculationConfig.builder()
            .numBuckets(1l)
            .direction(MonotonicDirection.INCREASING)
            .build()
            .toCalculation(null, false, a);

    List<Pair<Long, Long>> baseline = new ArrayList();
    List<Pair<Long, Long>> target = new ArrayList();
    baseline.add(Pair.of(0l, 6l));
    baseline.add(Pair.of(2l, 5l));
    baseline.add(Pair.of(3l, 4l));
    target.add(Pair.of(6l, 3l));
    val r = c.calculate(baseline, target, new ArrayList<>());
    assertEquals(Optional.of(0l), Optional.of(r.getAlertCount()));

    // Add an increasing one
    baseline.add(Pair.of(4l, 5l));
    val r2 = c.calculate(baseline, target, new ArrayList<>());
    assertEquals(Optional.of(1l), Optional.of(r2.getAlertCount()));
  }

  @Test
  public void testDoubleMetric() {
    val a = new Analyzer();
    a.setConfig(MonotonicCalculationConfig.builder().metric("count").build());
    val c =
        MonotonicCalculationConfig.builder()
            .numBuckets(1l)
            .direction(MonotonicDirection.INCREASING)
            .build()
            .toCalculation(null, false, a);

    List<Pair<Long, Double>> baseline = new ArrayList();
    List<Pair<Long, Double>> target = new ArrayList();
    baseline.add(Pair.of(0l, 6d));
    baseline.add(Pair.of(2l, 5d));
    baseline.add(Pair.of(3l, 4d));
    target.add(Pair.of(6l, 3d));
    val r = c.calculate(baseline, target, new ArrayList<>());
    assertEquals(Optional.of(0l), Optional.of(r.getAlertCount()));

    // Add an increasing one
    baseline.add(Pair.of(4l, 5d));
    val r2 = c.calculate(baseline, target, new ArrayList<>());
    assertEquals(Optional.of(1l), Optional.of(r2.getAlertCount()));
  }

  @Test
  public void testSkipDate() {
    val a = new Analyzer();
    a.setConfig(MonotonicCalculationConfig.builder().metric("unique_lower").build());
    val c =
        MonotonicCalculationConfig.builder()
            .numBuckets(1l)
            .direction(MonotonicDirection.INCREASING)
            .build()
            .toCalculation(null, false, a);

    List<Pair<Long, Long>> baseline = new ArrayList();
    List<Pair<Long, Long>> target = new ArrayList();
    baseline.add(Pair.of(0l, 6l));
    target.add(Pair.of(6l, 3l));
    val r = c.calculate(baseline, target, new ArrayList<>());
    assertEquals(Optional.of(0l), Optional.of(r.getAlertCount()));

    // Add an increasing one
    baseline.add(Pair.of(4l, 7l));
    val r2 = c.calculate(baseline, target, new ArrayList<>());
    assertEquals(Optional.of(1l), Optional.of(r2.getAlertCount()));
  }
}
