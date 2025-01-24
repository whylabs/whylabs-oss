package ai.whylabs.core.calculationsV3;

import static org.testng.Assert.*;

import ai.whylabs.core.calculationsV3.results.CalculationResult;
import ai.whylabs.core.calculationsV3.results.FixedCalculationResult;
import ai.whylabs.core.configV3.structure.Analyzers.FixedThresholdsConfig;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.DoubleStream;
import java.util.stream.LongStream;
import lombok.val;
import org.apache.commons.lang3.tuple.Pair;
import org.testng.annotations.Test;

public class FixedThresholdCalculationTest {

  @Test
  public void testCalculateNoAlert() {
    val target = DoubleStream.of(1.0).mapToObj(v -> Pair.of(0L, v)).collect(Collectors.toList());

    val config = FixedThresholdsConfig.builder().lower(0.0).upper(10.0).build();
    val calculation = new FixedThresholdCalculationDouble(null, null, true, config);
    val result = calculation.calculate(null, target, null);
    assertEquals(result.getAlertCount().longValue(), 0L);
  }

  @Test
  public void testCalculateAlertUpper() {
    val target = DoubleStream.of(30.0).mapToObj(v -> Pair.of(0L, v)).collect(Collectors.toList());

    val config = FixedThresholdsConfig.builder().lower(0.0).upper(20.0).build();
    val calculation = new FixedThresholdCalculationDouble(null, null, true, config);
    val result = calculation.calculate(null, target, null);
    assertEquals(result.getAlertCount().longValue(), 1L);
  }

  @Test
  public void testCalculateAlertFractionalUpper() {
    // this test will fail if the threshold has been converted to Long
    val target = DoubleStream.of(0.513).mapToObj(v -> Pair.of(0L, v)).collect(Collectors.toList());

    val config = FixedThresholdsConfig.builder().lower(0.0).upper(0.57).build();
    val calculation = new FixedThresholdCalculationDouble(null, null, true, config);
    val result = calculation.calculate(null, target, null);
    assertEquals(result.getAlertCount().longValue(), 0L);
  }

  @Test
  public void testCalculateAlertLower() {
    val target = DoubleStream.of(1.0).mapToObj(v -> Pair.of(0L, v)).collect(Collectors.toList());

    val config = FixedThresholdsConfig.builder().lower(70000.0).upper(100000.0).build();
    val calculation = new FixedThresholdCalculationDouble(null, null, true, config);
    val result = calculation.calculate(null, target, null);
    assertEquals(result.getAlertCount().longValue(), 1L);
  }

  @Test
  public void testCalculateAlertFractionalLower() {
    // this test will fail if the threshold has been converted to Long
    val target = DoubleStream.of(0.513).mapToObj(v -> Pair.of(0L, v)).collect(Collectors.toList());

    val config = FixedThresholdsConfig.builder().lower(0.0).lower(0.57).build();
    val calculation = new FixedThresholdCalculationDouble(null, null, true, config);
    val result = calculation.calculate(null, target, null);
    assertEquals(result.getAlertCount().longValue(), 1L);
  }

  @Test
  public void testCalculationNConsecutive() {
    val target = DoubleStream.of(1.0).mapToObj(v -> Pair.of(0L, v)).collect(Collectors.toList());

    val config =
        FixedThresholdsConfig.builder().nConsecutive(2l).lower(70000.0).upper(100000.0).build();
    val calculation = new FixedThresholdCalculationDouble(null, null, true, config);

    assertEquals(calculation.calculate(null, target, null).getAlertCount().longValue(), 0L);

    List<Pair<Long, CalculationResult>> feedbackLoop = new ArrayList<>();
    feedbackLoop.add(Pair.of(1000l, FixedCalculationResult.builder().value(0d).build()));

    assertEquals(calculation.calculate(null, target, feedbackLoop).getAlertCount().longValue(), 1L);
    feedbackLoop.add(Pair.of(1001l, FixedCalculationResult.builder().value(70005.0d).build()));
    assertEquals(calculation.calculate(null, target, feedbackLoop).getAlertCount().longValue(), 0L);
  }

  @Test
  public void testCalculationNConsecutiveLong() {
    val target = LongStream.of(1).mapToObj(v -> Pair.of(0L, v)).collect(Collectors.toList());

    val config =
        FixedThresholdsConfig.builder().nConsecutive(2l).lower(70000.0).upper(100000.0).build();
    val calculation = new FixedThresholdCalculationLong(null, null, true, config);

    assertEquals(calculation.calculate(null, target, null).getAlertCount().longValue(), 0L);

    List<Pair<Long, CalculationResult>> feedbackLoop = new ArrayList<>();
    feedbackLoop.add(Pair.of(1000l, FixedCalculationResult.builder().value(0d).build()));

    assertEquals(calculation.calculate(null, target, feedbackLoop).getAlertCount().longValue(), 1L);
    feedbackLoop.add(Pair.of(1001l, FixedCalculationResult.builder().value(70005.0d).build()));
    assertEquals(calculation.calculate(null, target, feedbackLoop).getAlertCount().longValue(), 0L);
  }
}
