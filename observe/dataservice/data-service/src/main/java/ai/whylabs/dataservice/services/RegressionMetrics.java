package ai.whylabs.dataservice.services;

import static java.lang.Math.max;

import ai.whylabs.dataservice.responses.ModelMetricsRow;
import ai.whylabs.druid.whylogs.util.DruidStringUtils;
import com.shaded.whylabs.com.google.protobuf.InvalidProtocolBufferException;
import com.whylogs.v0.core.message.RegressionMetricsMessage;
import lombok.Getter;
import lombok.NonNull;
import lombok.experimental.Delegate;
import lombok.val;

/**
 * This is a thin-veneer on top of the RegressionMetrics class from whylogs-java. This is the place
 * to put any calculations that we do not want to expose in the open-source whylogs-java package.
 */
public class RegressionMetrics {
  private interface exclude {
    com.whylogs.core.metrics.RegressionMetrics copy();
  }

  @Delegate(excludes = RegressionMetrics.exclude.class)
  @NonNull
  private com.whylogs.core.metrics.RegressionMetrics metrics;

  @Getter private Long lastUploadTs;

  RegressionMetrics(@NonNull com.whylogs.core.metrics.RegressionMetrics rm) {
    metrics = rm;
  }

  public RegressionMetrics merge(RegressionMetrics other) {
    if (other == null) {
      return this;
    }
    val rm = new RegressionMetrics(metrics.merge(other.metrics));
    rm.lastUploadTs = max(lastUploadTs, other.lastUploadTs);
    return rm;
  }

  public static RegressionMetrics fromModelMetricsRow(@NonNull ModelMetricsRow row)
      throws InvalidProtocolBufferException {
    RegressionMetrics rm = fromProtobuf(row.getMetrics());
    if (rm != null) rm.lastUploadTs = row.getLastUploadTs();
    return rm;
  }

  public static RegressionMetrics fromProtobuf(@NonNull byte[] bytes)
      throws InvalidProtocolBufferException {
    val sm = RegressionMetricsMessage.parseFrom(DruidStringUtils.decodeBase64(bytes));
    val core = com.whylogs.core.metrics.RegressionMetrics.fromProtobuf(sm);
    // possible for valid RegressionMetricsMessage to not generate valid RegressionMetrics object.
    // e.g. if target or prediction fields are not set
    return core == null ? null : new RegressionMetrics(core);
  }

  public double mse() {
    val count = this.getCount();
    return (count == 0 ? 0 : this.getSum2Diff() / count);
  }

  public double mae() {
    val count = this.getCount();
    return (count == 0 ? 0 : this.getSumAbsDiff() / count);
  }

  public double rmse() {
    return Math.sqrt(mse());
  }
}
