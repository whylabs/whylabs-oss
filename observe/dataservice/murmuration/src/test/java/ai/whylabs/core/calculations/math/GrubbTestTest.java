package ai.whylabs.core.calculations.math;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.everyItem;

import com.google.common.collect.ImmutableList;
import java.util.List;
import org.hamcrest.CoreMatchers;
import org.testng.annotations.Test;

public class GrubbTestTest {
  @Test
  public void filter1() {
    ImmutableList<Double> list = ImmutableList.of(1.0, 10.0, 10.0, 10.0);
    List<Double> result = GrubbTest.filter(list);
    assertThat(result, everyItem(CoreMatchers.is(10.0)));
  }

  @Test
  public void filter2() {
    ImmutableList<Double> list = ImmutableList.of(0d, 0d, 0d, 10.0);
    List<Double> result = GrubbTest.filter(list);
    assertThat(result, everyItem(CoreMatchers.is(0d)));
  }
}
