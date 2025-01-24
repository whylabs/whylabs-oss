package ai.whylabs.core.predicatesV3.AlertThreshold;

import java.util.function.Predicate;
import lombok.AllArgsConstructor;

@AllArgsConstructor
public class Max implements Predicate<Double> {
  private Double threshold;

  @Override
  public boolean test(Double d) {
    if (threshold == null || d == null) {
      return false;
    }
    if (d > threshold) {
      return true;
    }
    return false;
  }
}
