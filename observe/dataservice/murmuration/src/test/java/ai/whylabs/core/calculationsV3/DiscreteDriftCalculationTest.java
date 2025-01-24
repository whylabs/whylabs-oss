package ai.whylabs.core.calculationsV3;

import static java.util.stream.Collectors.toList;
import static org.hamcrest.MatcherAssert.assertThat;
import static org.testng.Assert.*;

import ai.whylabs.core.configV3.structure.Analyzers.DriftConfig;
import com.shaded.whylabs.org.apache.datasketches.frequencies.ItemsSketch;
import java.util.Arrays;
import java.util.List;
import java.util.Random;
import java.util.stream.IntStream;
import lombok.val;
import org.apache.commons.lang3.tuple.Pair;
import org.hamcrest.number.IsCloseTo;
import org.testng.annotations.Test;

public class DiscreteDriftCalculationTest {
  private static List<String> words =
      Arrays.asList(
          "bellybutton",
          "hothead",
          "gangland",
          "beehive",
          "push",
          "beak",
          "cattle",
          "drunken",
          "enormous",
          "gifted");

  // generate a ItemSketch over pseudo-randomly selected strings numbers.
  private static ItemsSketch<String> mkSketch(int seed) {
    val s = new ItemsSketch<String>(1 << 7);
    new Random(seed).ints(5, 0, words.size()).forEach(i -> s.update(words.get(i)));
    return s;
  }

  @Test
  public void testExpectRolledUpBaselineCalculate() {
    val config = DriftConfig.builder().build();
    val calc = new DiscreteDriftCalculation(null, null, true, config);
    Integer foo;
    val baseline =
        IntStream.range(0, 5).mapToObj(i -> mkSketch(i)).map(v -> Pair.of(0L, v)).collect(toList());
    val target =
        IntStream.range(0, 1).mapToObj(i -> mkSketch(i)).map(v -> Pair.of(0L, v)).collect(toList());

    val result = calc.calculate(baseline, target, null);
    assertNull(result); // null results because baseline is too long.
  }

  @Test
  public void testCalculateNoAlert() {
    val config = DriftConfig.builder().threshold(1.0).build();
    val calc = new DiscreteDriftCalculation(null, null, true, config);
    Integer foo;
    val baseline =
        IntStream.range(0, 1).mapToObj(i -> mkSketch(i)).map(v -> Pair.of(0L, v)).collect(toList());
    val target =
        IntStream.range(300, 301)
            .mapToObj(i -> mkSketch(i))
            .map(v -> Pair.of(0L, v))
            .collect(toList());

    val result = calc.calculate(baseline, target, null);
    assertThat(result.getMetricValue(), IsCloseTo.closeTo(0.7745966692414833, 0.01));
    assertEquals(result.getAlertCount().longValue(), 0L);
  }

  @Test
  public void testCalculateAlert() {
    val config = DriftConfig.builder().threshold(.5).build();
    val calc = new DiscreteDriftCalculation(null, null, true, config);
    Integer foo;
    val baseline =
        IntStream.range(0, 1).mapToObj(i -> mkSketch(i)).map(v -> Pair.of(0L, v)).collect(toList());
    val target =
        IntStream.range(300, 301)
            .mapToObj(i -> mkSketch(i))
            .map(v -> Pair.of(0L, v))
            .collect(toList());

    val result = calc.calculate(baseline, target, null);
    assertThat(result.getMetricValue(), IsCloseTo.closeTo(0.7745966692414833, 0.01));
    assertEquals(result.getAlertCount().longValue(), 1L);
  }
}
