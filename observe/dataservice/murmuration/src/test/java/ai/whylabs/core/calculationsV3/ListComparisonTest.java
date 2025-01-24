package ai.whylabs.core.calculationsV3;

import static org.testng.AssertJUnit.assertEquals;

import ai.whylabs.core.configV3.structure.Analyzers.ExpectedValue;
import ai.whylabs.core.configV3.structure.Analyzers.ListComparisonConfig;
import ai.whylabs.core.configV3.structure.Analyzers.ListComparisonOperator;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.DoubleStream;
import lombok.val;
import org.apache.commons.lang3.tuple.Pair;
import org.testng.annotations.Test;

public class ListComparisonTest {

  private List<Pair<Long, Double>> oneDouble =
      DoubleStream.of(1.0).mapToObj(v -> Pair.of(0L, v)).collect(Collectors.toList());
  private List<Pair<Long, Double>> twoDouble =
      DoubleStream.of(2.0).mapToObj(v -> Pair.of(0L, v)).collect(Collectors.toList());
  private List<Pair<Long, Double>> twoAndAHalfDouble =
      DoubleStream.of(2.5).mapToObj(v -> Pair.of(0L, v)).collect(Collectors.toList());
  private List<Pair<Long, Long>> oneLong = Arrays.asList(Pair.of(0l, 1l));
  private List<Pair<Long, Long>> twoLong = Arrays.asList(Pair.of(0l, 2l));
  private List<Pair<Long, String>> oneString = Arrays.asList(Pair.of(0l, "1"));
  private List<Pair<Long, String>> twoString = Arrays.asList(Pair.of(0l, "2"));

  @Test
  public void testShouldContainDouble() {
    val configLong =
        ListComparisonConfig.builder()
            .operator(ListComparisonOperator.in)
            .expected(
                Arrays.asList(
                    ExpectedValue.builder().intValue(1).build(),
                    ExpectedValue.builder().intValue(3).build()))
            .build();

    val calcLong = new ListCompareCalculationDouble(null, null, true, configLong);

    assertEquals(0, calcLong.calculate(null, oneDouble, null).getAlertCount(), 0);
    assertEquals(1, calcLong.calculate(null, twoAndAHalfDouble, null).getAlertCount(), 0);
    assertEquals(1, calcLong.calculate(null, twoDouble, null).getAlertCount(), 0);

    val configDouble =
        ListComparisonConfig.builder()
            .operator(ListComparisonOperator.in)
            .expected(
                Arrays.asList(
                    ExpectedValue.builder().floatValue(1.0).build(),
                    ExpectedValue.builder().floatValue(3.0).build()))
            .build();

    val calcDouble = new ListCompareCalculationDouble(null, null, true, configDouble);

    assertEquals(0, calcDouble.calculate(null, oneDouble, null).getAlertCount(), 0);
    assertEquals(1, calcDouble.calculate(null, twoAndAHalfDouble, null).getAlertCount(), 0);
    assertEquals(1, calcDouble.calculate(null, twoDouble, null).getAlertCount(), 0);

    val configString =
        ListComparisonConfig.builder()
            .operator(ListComparisonOperator.in)
            .expected(
                Arrays.asList(
                    ExpectedValue.builder().stringValue("1").build(),
                    ExpectedValue.builder().stringValue("3").build()))
            .build();

    val calcString = new ListCompareCalculationDouble(null, null, true, configString);

    assertEquals(0, calcString.calculate(null, oneDouble, null).getAlertCount(), 0);
    assertEquals(1, calcString.calculate(null, twoAndAHalfDouble, null).getAlertCount(), 0);
    assertEquals(1, calcString.calculate(null, twoDouble, null).getAlertCount(), 0);
  }

  @Test
  public void testDoubleAgainstBaseline() {
    val configString = ListComparisonConfig.builder().operator(ListComparisonOperator.in).build();

    val calcString = new ListCompareCalculationDouble(null, null, true, configString);
    val baseline = Arrays.asList(Pair.of(10000000l, 1.0), Pair.of(200000000l, 3.0));
    assertEquals(0, calcString.calculate(baseline, oneDouble, null).getAlertCount(), 0);
    assertEquals(1, calcString.calculate(baseline, twoAndAHalfDouble, null).getAlertCount(), 0);
    assertEquals(1, calcString.calculate(baseline, twoDouble, null).getAlertCount(), 0);
  }

  @Test
  public void testShouldNotContainDouble() {
    val config =
        ListComparisonConfig.builder()
            .operator(ListComparisonOperator.not_in)
            .expected(
                Arrays.asList(
                    ExpectedValue.builder().intValue(1).build(),
                    ExpectedValue.builder().intValue(3).build()))
            .build();

    val calc = new ListCompareCalculationDouble(null, null, true, config);

    assertEquals(1, calc.calculate(null, oneDouble, null).getAlertCount(), 0);
    assertEquals(0, calc.calculate(null, twoDouble, null).getAlertCount(), 0);
  }

  @Test
  public void testLong() {
    val configLong =
        ListComparisonConfig.builder()
            .operator(ListComparisonOperator.in)
            .expected(
                Arrays.asList(
                    ExpectedValue.builder().intValue(1).build(),
                    ExpectedValue.builder().intValue(3).build()))
            .build();

    val calcLong = new ListCompareCalculationLong(null, null, true, configLong);

    assertEquals(0, calcLong.calculate(null, oneLong, null).getAlertCount(), 0);
    assertEquals(1, calcLong.calculate(null, twoLong, null).getAlertCount(), 0);
  }

  @Test
  public void testLongAgainstBaseline() {
    val configLong = ListComparisonConfig.builder().operator(ListComparisonOperator.in).build();

    val baseline = Arrays.asList(Pair.of(10000000l, 1l), Pair.of(200000000l, 3l));

    val calcLong = new ListCompareCalculationLong(null, null, true, configLong);

    assertEquals(0, calcLong.calculate(baseline, oneLong, null).getAlertCount(), 0);
    assertEquals(1, calcLong.calculate(baseline, twoLong, null).getAlertCount(), 0);
  }

  @Test
  public void testShouldNotContainLong() {
    val config =
        ListComparisonConfig.builder()
            .operator(ListComparisonOperator.not_in)
            .expected(
                Arrays.asList(
                    ExpectedValue.builder().intValue(1).build(),
                    ExpectedValue.builder().intValue(3).build()))
            .build();

    val calc = new ListCompareCalculationLong(null, null, true, config);

    assertEquals(1, calc.calculate(null, oneLong, null).getAlertCount(), 0);
    assertEquals(0, calc.calculate(null, twoLong, null).getAlertCount(), 0);
  }

  @Test
  public void testStringList() {
    val configLong =
        ListComparisonConfig.builder()
            .operator(ListComparisonOperator.in)
            .expected(
                Arrays.asList(
                    ExpectedValue.builder().intValue(1).build(),
                    ExpectedValue.builder().intValue(3).build()))
            .build();

    val calcString = new ListCompareCalculationString(null, null, true, configLong);

    assertEquals(0, calcString.calculate(null, oneString, null).getAlertCount(), 0);
    assertEquals(1, calcString.calculate(null, twoString, null).getAlertCount(), 0);
  }

  @Test
  public void testStringAgainstBaseline() {
    val configLong = ListComparisonConfig.builder().operator(ListComparisonOperator.in).build();

    val baseline = Arrays.asList(Pair.of(10000000l, "1"), Pair.of(200000000l, "3"));

    val calcString = new ListCompareCalculationString(null, null, true, configLong);

    assertEquals(0, calcString.calculate(baseline, oneString, null).getAlertCount(), 0);
    assertEquals(1, calcString.calculate(baseline, twoString, null).getAlertCount(), 0);
  }

  @Test
  public void testShouldNotContainString() {
    val config =
        ListComparisonConfig.builder()
            .operator(ListComparisonOperator.not_in)
            .expected(
                Arrays.asList(
                    ExpectedValue.builder().intValue(1).build(),
                    ExpectedValue.builder().intValue(3).build()))
            .build();

    val calc = new ListCompareCalculationString(null, null, true, config);

    assertEquals(1, calc.calculate(null, oneString, null).getAlertCount(), 0);
    assertEquals(0, calc.calculate(null, twoString, null).getAlertCount(), 0);
  }
}
