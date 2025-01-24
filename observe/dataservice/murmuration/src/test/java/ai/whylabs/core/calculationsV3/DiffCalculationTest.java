package ai.whylabs.core.calculationsV3;

import static java.util.stream.Collectors.toList;
import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.*;
import static org.hamcrest.core.IsNull.notNullValue;
import static org.hamcrest.core.IsNull.nullValue;

import ai.whylabs.core.calculationsV3.results.DiffCalculationResult;
import ai.whylabs.core.configV3.structure.Analyzers.DiffConfig;
import ai.whylabs.core.configV3.structure.Analyzers.DiffMode;
import ai.whylabs.core.configV3.structure.Analyzers.ThresholdType;
import ai.whylabs.core.structures.monitor.events.AnalyzerResult;
import java.util.Collections;
import java.util.List;
import java.util.stream.IntStream;
import lombok.val;
import org.apache.commons.lang3.tuple.Pair;
import org.hamcrest.number.IsCloseTo;
import org.testng.annotations.Test;

public class DiffCalculationTest {
  @Test
  public void testAbsoluteDiff() {
    val config = DiffConfig.builder().threshold(2.0).build();
    val calculation = new DiffCalculation(null, null, true, config);

    val baseline =
        IntStream.range(1, 2).asDoubleStream().mapToObj(v -> Pair.of(0L, v)).collect(toList());
    val target =
        IntStream.range(2, 3).asDoubleStream().mapToObj(v -> Pair.of(1L, v)).collect(toList());

    val diffResult = calculation.calculate(baseline, target, null);
    assertThat(diffResult.getDiff(), IsCloseTo.closeTo(1.0, 0.01));
    assertThat(diffResult.getAlertCount(), is(0L));
    assertThat(diffResult.getTargetValue(), IsCloseTo.closeTo(2.0, 0.01));
    assertThat(diffResult.getLower(), IsCloseTo.closeTo(-1, 0.01));
    assertThat(diffResult.getUpper(), IsCloseTo.closeTo(3, 0.01));

    // confirm that target value and threshold bounds appear in final analyzer result.
    val builder = AnalyzerResult.builder();
    diffResult.populate(builder);
    val analyzerResult = builder.build();
    assertThat(analyzerResult.getThreshold_metricValue(), is(diffResult.getTargetValue()));
    assertThat(analyzerResult.getThreshold_calculatedLower(), is(diffResult.getLower()));
    assertThat(analyzerResult.getThreshold_calculatedUpper(), is(diffResult.getUpper()));
  }

  @Test
  public void testPercentageDiff() {
    // 50% threshold is represented by the whole number 50D
    val config = DiffConfig.builder().mode(DiffMode.pct).threshold(50D).build();
    val calculation = new DiffCalculation(null, null, true, config);

    List<Pair<Long, Double>> baseline, target;
    DiffCalculationResult diffResult;

    // baseline 100 -> target 55 is a 45% difference, no alert
    baseline = Collections.singletonList(Pair.of(0L, 100D));
    target = Collections.singletonList(Pair.of(1L, 55D));
    diffResult = calculation.calculate(baseline, target, null);
    assertThat(diffResult.getDiff(), IsCloseTo.closeTo(45.0, 0.01));
    assertThat(diffResult.getAlertCount(), is(0L));
    assertThat(diffResult.getTargetValue(), IsCloseTo.closeTo(55.0, 0.01));
    assertThat(diffResult.getLower(), IsCloseTo.closeTo(50.0, 0.01));
    assertThat(diffResult.getUpper(), IsCloseTo.closeTo(150.0, 0.01));

    // confirm that target value and threshold bounds appear in final analyzer result.
    val builder = AnalyzerResult.builder();
    diffResult.populate(builder);
    val analyzerResult = builder.build();
    assertThat(analyzerResult.getThreshold_metricValue(), is(diffResult.getTargetValue()));
    assertThat(analyzerResult.getThreshold_calculatedLower(), is(diffResult.getLower()));
    assertThat(analyzerResult.getThreshold_calculatedUpper(), is(diffResult.getUpper()));

    // baseline 55 -> target 100 is an 81% difference and should alert.
    baseline = Collections.singletonList(Pair.of(0L, 55D));
    target = Collections.singletonList(Pair.of(1L, 100D));
    diffResult = calculation.calculate(baseline, target, null);
    assertThat(diffResult.getDiff(), IsCloseTo.closeTo(81.81, 0.01));
    assertThat(diffResult.getAlertCount(), is(1L));
    assertThat(diffResult.getTargetValue(), IsCloseTo.closeTo(100.0, 0.01));
    assertThat(diffResult.getLower(), IsCloseTo.closeTo(27.5, 0.01));
    assertThat(diffResult.getUpper(), IsCloseTo.closeTo(82.5, 0.01));
  }

  @Test
  public void testAlert() {
    val config = DiffConfig.builder().threshold(2.0).build();
    val calculation = new DiffCalculation(null, null, true, config);

    val baseline =
        IntStream.range(1, 2).asDoubleStream().mapToObj(v -> Pair.of(0L, v)).collect(toList());
    val target =
        IntStream.range(5, 6).asDoubleStream().mapToObj(v -> Pair.of(1L, v)).collect(toList());

    val results = calculation.calculate(baseline, target, null);
    assertThat(results.getDiff(), IsCloseTo.closeTo(4.0, 0.01));
    assertThat(results.getAlertCount(), is(1L));
  }

  @Test
  public void testIncreaseOnly() {
    val config = DiffConfig.builder().thresholdType(ThresholdType.upper).threshold(1.0).build();
    val calculation = new DiffCalculation(null, null, true, config);

    val baseline =
        IntStream.range(1, 2).asDoubleStream().mapToObj(v -> Pair.of(0L, v)).collect(toList());
    val targetIncreased =
        IntStream.range(5, 6).asDoubleStream().mapToObj(v -> Pair.of(1L, v)).collect(toList());
    val targetDecreased =
        IntStream.range(-6, -5).asDoubleStream().mapToObj(v -> Pair.of(1L, v)).collect(toList());

    val resultsIncreased = calculation.calculate(baseline, targetIncreased, null);
    assertThat(resultsIncreased.getAlertCount(), is(1L));
    assertThat(resultsIncreased.getLower(), is(nullValue()));
    assertThat(resultsIncreased.getUpper(), is(notNullValue()));

    val resultsDecreased = calculation.calculate(baseline, targetDecreased, null);
    assertThat(resultsDecreased.getAlertCount(), is(0L));
    assertThat(resultsDecreased.getLower(), is(nullValue()));
    assertThat(resultsDecreased.getUpper(), is(notNullValue()));
  }

  @Test
  public void testDecreaseOnly() {
    val config = DiffConfig.builder().thresholdType(ThresholdType.lower).threshold(1.0).build();
    val calculation = new DiffCalculation(null, null, true, config);

    val baseline =
        IntStream.range(1, 2).asDoubleStream().mapToObj(v -> Pair.of(0L, v)).collect(toList());
    val targetIncreased =
        IntStream.range(5, 6).asDoubleStream().mapToObj(v -> Pair.of(1L, v)).collect(toList());
    val targetDecreased =
        IntStream.range(-6, -5).asDoubleStream().mapToObj(v -> Pair.of(1L, v)).collect(toList());

    val resultsIncreased = calculation.calculate(baseline, targetIncreased, null);
    assertThat(resultsIncreased.getAlertCount(), is(0L));
    assertThat(resultsIncreased.getLower(), is(notNullValue()));
    assertThat(resultsIncreased.getUpper(), is(nullValue()));

    val resultsDecreased = calculation.calculate(baseline, targetDecreased, null);
    assertThat(resultsDecreased.getAlertCount(), is(1L));
    assertThat(resultsDecreased.getLower(), is(notNullValue()));
    assertThat(resultsDecreased.getUpper(), is(nullValue()));
  }

  @Test
  public void testNegativeDiff() {
    val config = DiffConfig.builder().threshold(2.0).build();
    val calculation = new DiffCalculation(null, null, true, config);

    val baseline =
        IntStream.range(5, 6).asDoubleStream().mapToObj(v -> Pair.of(0L, v)).collect(toList());
    val target =
        IntStream.range(1, 2).asDoubleStream().mapToObj(v -> Pair.of(1L, v)).collect(toList());

    val results = calculation.calculate(baseline, target, null);
    assertThat(results.getDiff(), IsCloseTo.closeTo(4.0, 0.01));
    assertThat(results.getAlertCount(), is(1L));
    assertThat(results.getLower(), is(notNullValue()));
    assertThat(results.getUpper(), is(notNullValue()));
    assertThat(results.getUpper(), greaterThan(results.getLower()));
  }

  @Test
  public void testPctChange() {
    val config = DiffConfig.builder().mode(DiffMode.pct).threshold(0.5).build();
    val calculation = new DiffCalculation(null, null, true, config);
    List<Pair<Long, Double>> baseline, target;

    baseline = Collections.singletonList(Pair.of(0L, 5D));
    target = Collections.singletonList(Pair.of(1L, 1D));
    val results = calculation.calculate(baseline, target, null);
    assertThat(results.getDiff(), IsCloseTo.closeTo(80.0, 0.01));
    assertThat(results.getLower(), IsCloseTo.closeTo(4.975, 0.01));
    assertThat(results.getUpper(), IsCloseTo.closeTo(5.025, 0.01));
    assertThat(results.getAlertCount(), is(1L));
  }

  // verify we do NOT get an exception for large percentage threshold above 100%
  @Test()
  public void testBadPctChange() {
    // percentage threshold should be between [0,1)
    val config = DiffConfig.builder().mode(DiffMode.pct).threshold(150.0).build();
    val calculation = new DiffCalculation(null, null, true, config);

    List<Pair<Long, Double>> baseline, target;

    baseline = Collections.singletonList(Pair.of(0L, 5D));
    target = Collections.singletonList(Pair.of(1L, 1D));
    val results = calculation.calculate(baseline, target, null);
    assertThat(results.getDiff(), IsCloseTo.closeTo(80.0, 0.01));
    assertThat(results.getLower(), IsCloseTo.closeTo(-2.5, 0.01));
    assertThat(results.getUpper(), IsCloseTo.closeTo(12.5, 0.01));
    assertThat(results.getAlertCount(), is(0L));
  }

  @Test(expectedExceptions = {IllegalArgumentException.class})
  public void testBadAbsChange() {
    // absolute threshold should be between [0,Double.MAX_VALUE)
    val config = DiffConfig.builder().mode(DiffMode.pct).threshold(-1.5).build();
    val calculation = new DiffCalculation(null, null, true, config);

    val baseline =
        IntStream.range(5, 6).asDoubleStream().mapToObj(v -> Pair.of(0L, v)).collect(toList());
    val target =
        IntStream.range(1, 2).asDoubleStream().mapToObj(v -> Pair.of(1L, v)).collect(toList());

    val results = calculation.calculate(baseline, target, null);
  }

  @Test(expectedExceptions = {IllegalArgumentException.class})
  public void testLongBaseline() {
    val config = DiffConfig.builder().threshold(2.0).build();
    val calculation = new DiffCalculation(null, null, true, config);

    val baseline =
        IntStream.range(5, 9).asDoubleStream().mapToObj(v -> Pair.of(0L, v)).collect(toList());
    val target =
        IntStream.range(1, 2).asDoubleStream().mapToObj(v -> Pair.of(1L, v)).collect(toList());

    val results = calculation.calculate(baseline, target, null);
  }

  @Test(expectedExceptions = {IllegalArgumentException.class})
  public void testLongTarget() {
    val config = DiffConfig.builder().threshold(2.0).build();
    val calculation = new DiffCalculation(null, null, true, config);

    val baseline =
        IntStream.range(5, 6).asDoubleStream().mapToObj(v -> Pair.of(0L, v)).collect(toList());
    val target =
        IntStream.range(1, 3).asDoubleStream().mapToObj(v -> Pair.of(1L, v)).collect(toList());

    val results = calculation.calculate(baseline, target, null);
    assertThat(results.getDiff(), IsCloseTo.closeTo(4.0, 0.01));
    assertThat(results.getAlertCount(), is(1L));
  }

  @Test(
      expectedExceptions = {IllegalArgumentException.class},
      expectedExceptionsMessageRegExp = ".*expected non-null values")
  public void testNullBaselineValue() {
    val config = DiffConfig.builder().threshold(2.0).build();
    val calculation = new DiffCalculation(null, null, true, config);

    val baseline = Collections.singletonList(Pair.of(0L, (Double) null));
    val target = Collections.singletonList(Pair.of(0L, 0.0));
    val results = calculation.calculate(baseline, target, null);
  }

  @Test(
      expectedExceptions = {IllegalArgumentException.class},
      expectedExceptionsMessageRegExp = ".*expected non-null values")
  public void testNullTargetValue() {
    val config = DiffConfig.builder().threshold(2.0).build();
    val calculation = new DiffCalculation(null, null, true, config);

    val baseline = Collections.singletonList(Pair.of(0L, 0.0));
    val target = Collections.singletonList(Pair.of(0L, (Double) null));
    val results = calculation.calculate(baseline, target, null);
  }

  @Test
  public void testPctEdgeCases() {
    val config = DiffConfig.builder().mode(DiffMode.pct).threshold(0.5).build();
    val calculation = new DiffCalculation(null, null, true, config);

    List<Pair<Long, Double>> baseline = Collections.singletonList(Pair.of(0L, Double.MIN_VALUE));
    List<Pair<Long, Double>> target = Collections.singletonList(Pair.of(0L, 0.0));
    DiffCalculationResult results = calculation.calculate(baseline, target, null);
    assertThat(results.getDiff(), IsCloseTo.closeTo(100.0, 0.01));
    assertThat(results.getAlertCount(), is(1L));
    assertThat(results.getLower(), is(notNullValue()));
    assertThat(results.getUpper(), is(notNullValue()));

    // pathological case when baseline==MIN_VALUE
    assertThat(results.getUpper(), equalTo(results.getLower()));

    baseline = Collections.singletonList(Pair.of(0L, 0.0));
    target = Collections.singletonList(Pair.of(0L, 0.0));
    results = calculation.calculate(baseline, target, null);
    assertThat(results.getDiff(), IsCloseTo.closeTo(0.0, 0.01));
    assertThat(results.getAlertCount(), is(0L));
    assertThat(results.getLower(), is(notNullValue()));
    assertThat(results.getUpper(), is(notNullValue()));

    // pathological case when baseline==0.0
    assertThat(results.getUpper(), equalTo(results.getLower()));
    assertThat(results.getUpper(), IsCloseTo.closeTo(0.0, 0.01));

    baseline = Collections.singletonList(Pair.of(0L, Double.NaN));
    target = Collections.singletonList(Pair.of(0L, 0.0));
    results = calculation.calculate(baseline, target, null);
    assertThat(results.getDiff(), is(Double.NaN));
    assertThat(results.getAlertCount(), is(0L));
    assertThat(results.getLower(), is(notNullValue()));
    assertThat(results.getUpper(), is(notNullValue()));

    // pathological case when baseline==NaN
    assertThat(results.getUpper(), equalTo(results.getLower()));
    assertThat(results.getUpper(), is(Double.NaN));
  }
}
