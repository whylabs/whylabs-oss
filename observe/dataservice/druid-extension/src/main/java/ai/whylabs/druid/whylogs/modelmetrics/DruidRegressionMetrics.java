package ai.whylabs.druid.whylogs.modelmetrics;

import com.whylogs.core.metrics.RegressionMetrics;
import lombok.experimental.Delegate;
import lombok.val;

/**
 * This is a thin-veneer on top of the RegressionMetrics class from whylogs-java. This is the place
 * to put any calculations that we do not want to expose in the open-source whylogs-java package.
 */
public class DruidRegressionMetrics {
  @Delegate() private RegressionMetrics metrics;

  DruidRegressionMetrics(RegressionMetrics rm) {
    metrics = rm;
  }

  public double meanSquaredError() {
    val count = metrics.getCount();
    return count == 0 ? 0 : metrics.getSum2Diff() / count;
  }

  public double meanAbsoluteError() {
    val count = metrics.getCount();
    return count == 0 ? 0 : metrics.getSumAbsDiff() / count;
  }

  public double rootMeanSquaredError() {
    return Math.sqrt(meanSquaredError());
  }
}
