package ai.whylabs.core.predicatesV3.AlertThreshold;

import java.util.function.Predicate;

public class MinMax implements Predicate<Double> {

  private Min minPredicate;
  private Max maxPredicate;

  public MinMax(Double minThreshold, Double maxThreshold) {
    this.minPredicate = new Min(minThreshold);
    this.maxPredicate = new Max(maxThreshold);
  }

  @Override
  public boolean test(Double d) {
    return (minPredicate.test(d) || maxPredicate.test(d));
  }
}
