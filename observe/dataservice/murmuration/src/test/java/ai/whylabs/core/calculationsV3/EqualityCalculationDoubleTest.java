package ai.whylabs.core.calculationsV3;

import static java.util.stream.Collectors.toList;
import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.is;
import static org.testng.Assert.*;

import ai.whylabs.core.calculationsV3.results.EqualityCalculationResult;
import ai.whylabs.core.configV3.structure.Analyzers.ComparisonConfig;
import ai.whylabs.core.configV3.structure.Analyzers.ExpectedValue;
import java.util.Collections;
import java.util.List;
import java.util.stream.LongStream;
import lombok.val;
import org.apache.commons.lang3.tuple.Pair;
import org.testng.annotations.Test;

public class EqualityCalculationDoubleTest {

  @Test
  public void testDoubleComparedToInt() {

    val config =
        ComparisonConfig.builder()
            .expected(ExpectedValue.builder().intValue(9).build())
            .metric("count")
            .operator("eq")
            .build();
    val calc = new EqualityCalculationDouble(null, null, true, config);
    val baseline =
        LongStream.range(0, 5).boxed().map(v -> Pair.of(0L, Double.valueOf(v))).collect(toList());
    List<Pair<Long, Double>> target = Collections.singletonList(Pair.of(0L, 9.4D));

    EqualityCalculationResult result = calc.calculate(baseline, target, null);
    assertThat(result.getObserved(), is("9.4"));
    assertThat(result.getExpected(), is("9.0"));
    assertThat(result.getAlertCount(), is(1L));

    target = Collections.singletonList(Pair.of(0L, 9.00002D));
    result = calc.calculate(baseline, target, null);
    assertThat(result.getObserved(), is("9.00002"));
    assertThat(result.getExpected(), is("9.0"));
    assertThat(result.getAlertCount(), is(1L));

    target = Collections.singletonList(Pair.of(0L, 9.000000000000002D));
    result = calc.calculate(baseline, target, null);
    assertThat(result.getObserved(), is("9.000000000000002"));
    assertThat(result.getExpected(), is("9.0"));
    assertThat(result.getAlertCount(), is(0L));

    target = Collections.singletonList(Pair.of(0L, 9.000000000000003D));
    result = calc.calculate(baseline, target, null);
    assertThat(result.getObserved(), is("9.000000000000004"));
    assertThat(result.getExpected(), is("9.0"));
    assertThat(result.getAlertCount(), is(1L));
  }

  @Test
  public void testDoubleComparedToFloat() {

    val config =
        ComparisonConfig.builder()
            .expected(ExpectedValue.builder().floatValue(9.0).build())
            .metric("count")
            .operator("eq")
            .build();
    val calc = new EqualityCalculationDouble(null, null, true, config);
    val baseline =
        LongStream.range(0, 5).boxed().map(v -> Pair.of(0L, Double.valueOf(v))).collect(toList());
    List<Pair<Long, Double>> target = Collections.singletonList(Pair.of(0L, 9.4D));

    EqualityCalculationResult result = calc.calculate(baseline, target, null);
    assertThat(result.getObserved(), is("9.4"));
    assertThat(result.getExpected(), is("9.0"));
    assertThat(result.getAlertCount(), is(1L));

    target = Collections.singletonList(Pair.of(0L, 9.00002D));
    result = calc.calculate(baseline, target, null);
    assertThat(result.getObserved(), is("9.00002"));
    assertThat(result.getExpected(), is("9.0"));
    assertThat(result.getAlertCount(), is(1L));

    target = Collections.singletonList(Pair.of(0L, 9.000000000000002D));
    result = calc.calculate(baseline, target, null);
    assertThat(result.getObserved(), is("9.000000000000002"));
    assertThat(result.getExpected(), is("9.0"));
    assertThat(result.getAlertCount(), is(0L));

    target = Collections.singletonList(Pair.of(0L, 9.000000000000003D));
    result = calc.calculate(baseline, target, null);
    assertThat(result.getObserved(), is("9.000000000000004"));
    assertThat(result.getExpected(), is("9.0"));
    assertThat(result.getAlertCount(), is(1L));
  }

  @Test
  public void testDoubleComparedToStr() {

    val config =
        ComparisonConfig.builder()
            .expected(ExpectedValue.builder().stringValue("9.0").build())
            .metric("count")
            .operator("eq")
            .build();
    val calc = new EqualityCalculationDouble(null, null, true, config);
    val baseline =
        LongStream.range(0, 5).boxed().map(v -> Pair.of(0L, Double.valueOf(v))).collect(toList());
    List<Pair<Long, Double>> target = Collections.singletonList(Pair.of(0L, 9.4D));

    EqualityCalculationResult result = calc.calculate(baseline, target, null);
    assertThat(result.getObserved(), is("9.4"));
    assertThat(result.getExpected(), is("9.0"));
    assertThat(result.getAlertCount(), is(1L));

    target = Collections.singletonList(Pair.of(0L, 9.00002D));
    result = calc.calculate(baseline, target, null);
    assertThat(result.getObserved(), is("9.00002"));
    assertThat(result.getExpected(), is("9.0"));
    assertThat(result.getAlertCount(), is(1L));

    target = Collections.singletonList(Pair.of(0L, 9.000000000000002D));
    result = calc.calculate(baseline, target, null);
    assertThat(result.getObserved(), is("9.000000000000002"));
    assertThat(result.getExpected(), is("9.0"));
    assertThat(result.getAlertCount(), is(0L));

    target = Collections.singletonList(Pair.of(0L, 9.000000000000003D));
    result = calc.calculate(baseline, target, null);
    assertThat(result.getObserved(), is("9.000000000000004"));
    assertThat(result.getExpected(), is("9.0"));
    assertThat(result.getAlertCount(), is(1L));
  }

  @Test(expectedExceptions = {IllegalArgumentException.class})
  public void testFailureDoubleComparedToStr() {
    val config =
        ComparisonConfig.builder()
            .expected(ExpectedValue.builder().stringValue("blah").build())
            .metric("count")
            .operator("eq")
            .build();

    val calc = new EqualityCalculationDouble(null, null, true, config);
    val baseline =
        LongStream.range(0, 5).boxed().map(v -> Pair.of(0L, Double.valueOf(v))).collect(toList());
    List<Pair<Long, Double>> target = Collections.singletonList(Pair.of(0L, 9.4D));
    EqualityCalculationResult result = calc.calculate(null, target, null);
  }
}
