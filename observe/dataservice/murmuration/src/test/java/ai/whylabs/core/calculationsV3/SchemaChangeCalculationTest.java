package ai.whylabs.core.calculationsV3;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.is;

import ai.whylabs.core.calculationsV3.results.SchemaChangeResult;
import ai.whylabs.core.configV3.structure.Analyzers.ColumnListChangeConfig;
import ai.whylabs.core.configV3.structure.Analyzers.ColumnListChangeMode;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.IntStream;
import org.apache.commons.lang3.tuple.Pair;
import org.testng.annotations.Test;

public class SchemaChangeCalculationTest {
  // spotless:off
  static List<String> featureNames =
      Arrays.asList(
          "temp", "year", "holiday", "workingday", "season_4", "hour", "month", "output_count",
          "weather_3", "weather_4", "atemp", "weather_1", "humidity", "weather_2", "windspeed",
          "weather_0", "season_3", "day", "season_2", "season_1", "season_0");
  // spotless:on

  @Test
  public void testCalculate() {

    // Test ON_ADD
    ColumnListChangeConfig config =
        ColumnListChangeConfig.builder().mode(ColumnListChangeMode.ON_ADD).build();
    SchemaChangeCalculation calculation = new SchemaChangeCalculation(null, null, false, config);
    List<Pair<Long, List<String>>> baseline;
    List<Pair<Long, List<String>>> target;
    SchemaChangeResult result;

    //  ON_ADD - no change in features list, no alert
    baseline =
        IntStream.range(0, 10)
            .mapToObj(v -> Pair.of(0L, featureNames))
            .collect(Collectors.toList());
    target =
        IntStream.range(0, 1).mapToObj(v -> Pair.of(0L, featureNames)).collect(Collectors.toList());
    result = calculation.calculate(baseline, target, null);
    assertThat(result.getAlertCount(), is(0L)); // no changes expected
    assertThat(result.getAdded(), is(0L));
    assertThat(result.getRemoved(), is(0L));

    //  ON_ADD -  removed features - no alert
    baseline =
        IntStream.range(0, 10)
            .mapToObj(v -> Pair.of(0L, featureNames.subList(0, 10)))
            .collect(Collectors.toList());
    target =
        IntStream.range(0, 1)
            .mapToObj(v -> Pair.of(0L, featureNames.subList(0, 6)))
            .collect(Collectors.toList());
    result = calculation.calculate(baseline, target, null);
    assertThat(result.getAlertCount(), is(0L));
    assertThat(result.getAdded(), is(0L));
    assertThat(result.getRemoved(), is(4L));

    //  ON_ADD - added features - expect alert
    baseline =
        IntStream.range(0, 10)
            .mapToObj(v -> Pair.of(0L, featureNames.subList(0, 6)))
            .collect(Collectors.toList());
    target =
        IntStream.range(0, 1)
            .mapToObj(v -> Pair.of(0L, featureNames.subList(0, 10)))
            .collect(Collectors.toList());
    result = calculation.calculate(baseline, target, null);
    assertThat(result.getAlertCount(), is(1L));
    assertThat(result.getAdded(), is(4L));

    // Test ON_REMOVE
    config = ColumnListChangeConfig.builder().mode(ColumnListChangeMode.ON_REMOVE).build();
    calculation = new SchemaChangeCalculation(null, null, false, config);

    //  ON_REMOVE - no change in features list, no alert
    baseline =
        IntStream.range(0, 10)
            .mapToObj(v -> Pair.of(0L, featureNames))
            .collect(Collectors.toList());
    target =
        IntStream.range(0, 1).mapToObj(v -> Pair.of(0L, featureNames)).collect(Collectors.toList());
    result = calculation.calculate(baseline, target, null);
    assertThat(result.getAlertCount(), is(0L)); // no changes expected
    assertThat(result.getAdded(), is(0L));

    //  ON_REMOVE -  removed features - expect alert
    baseline =
        IntStream.range(0, 10)
            .mapToObj(v -> Pair.of(0L, featureNames.subList(0, 10)))
            .collect(Collectors.toList());
    target =
        IntStream.range(0, 1)
            .mapToObj(v -> Pair.of(0L, featureNames.subList(0, 6)))
            .collect(Collectors.toList());
    result = calculation.calculate(baseline, target, null);
    assertThat(result.getAlertCount(), is(1L));
    assertThat(result.getRemoved(), is(4L));

    //  ON_REMOVE - added features - no alert
    baseline =
        IntStream.range(0, 10)
            .mapToObj(v -> Pair.of(0L, featureNames.subList(0, 6)))
            .collect(Collectors.toList());
    target =
        IntStream.range(0, 1)
            .mapToObj(v -> Pair.of(0L, featureNames.subList(0, 10)))
            .collect(Collectors.toList());
    result = calculation.calculate(baseline, target, null);
    assertThat(result.getAlertCount(), is(0L));
    assertThat(result.getRemoved(), is(0L));

    // Test ON_ADD_AND_REMOVE
    config = ColumnListChangeConfig.builder().mode(ColumnListChangeMode.ON_ADD_AND_REMOVE).build();
    calculation = new SchemaChangeCalculation(null, null, false, config);

    //  ON_ADD_AND_REMOVE - no change in features list, no alert
    baseline =
        IntStream.range(0, 10)
            .mapToObj(v -> Pair.of(0L, featureNames))
            .collect(Collectors.toList());
    target =
        IntStream.range(0, 1).mapToObj(v -> Pair.of(0L, featureNames)).collect(Collectors.toList());
    result = calculation.calculate(baseline, target, null);
    assertThat(result.getAlertCount(), is(0L)); // no changes expected
    assertThat(result.getRemoved(), is(0L));
    assertThat(result.getAdded(), is(0L));

    //  ON_ADD_AND_REMOVE -  add and removed features - expect alert
    baseline =
        IntStream.range(0, 10)
            .mapToObj(v -> Pair.of(0L, featureNames.subList(0, 10)))
            .collect(Collectors.toList());
    target =
        IntStream.range(0, 1)
            .mapToObj(v -> Pair.of(0L, featureNames.subList(6, 14)))
            .collect(Collectors.toList());
    result = calculation.calculate(baseline, target, null);
    assertThat(result.getAlertCount(), is(1L));
    assertThat(result.getAdded(), is(4L));
    assertThat(result.getRemoved(), is(6L));
  }
}
