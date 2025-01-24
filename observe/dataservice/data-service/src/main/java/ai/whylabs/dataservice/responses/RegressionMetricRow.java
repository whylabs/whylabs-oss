package ai.whylabs.dataservice.responses;

import ai.whylabs.dataservice.services.RegressionMetrics;
import lombok.Data;
import lombok.val;

// stores individual value metrics derived from ScoreMatrixMessage protobuf message.
// These metrics are useful for monitor alerting.
@Data
public class RegressionMetricRow {
  private final Long timestamp;

  private final double mean_absolute_error;
  private final double mean_squared_error;
  private final double root_mean_squared_error;
  private final long count;
  private final long last_upload_ts;

  /**
   * Calculates single-value metrics derived from ScoreMatrixMessage protobuf message. Unlike the
   * results from `toSummary`, the results from this calculation are individual double values, not
   * vectors. These metrics are useful for monitor alerting. translated from
   * `compute_metrics.py:track_metrics` in mockingbird.
   */
  public RegressionMetricRow(Long timestamp, RegressionMetrics metrics) {
    val count = metrics.getCount();
    val mse = count == 0 ? 0 : metrics.getSum2Diff() / count;

    this.mean_absolute_error = (count == 0 ? 0 : metrics.getSumAbsDiff() / count);
    this.mean_squared_error = mse;
    this.timestamp = timestamp;
    this.root_mean_squared_error = Math.sqrt(mse);
    this.count = count;
    this.last_upload_ts = metrics.getLastUploadTs();
  }
}
