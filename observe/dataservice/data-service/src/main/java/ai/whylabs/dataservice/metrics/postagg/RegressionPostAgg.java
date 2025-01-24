package ai.whylabs.dataservice.metrics.postagg;

import ai.whylabs.dataservice.metrics.agg.Agg;
import ai.whylabs.dataservice.metrics.result.QueryResultStatus;
import ai.whylabs.dataservice.metrics.result.TimeSeriesResult;
import ai.whylabs.dataservice.services.RegressionMetrics;
import com.clearspring.analytics.util.Lists;
import com.fasterxml.jackson.annotation.JsonTypeName;
import com.google.common.annotations.VisibleForTesting;
import java.util.List;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import org.apache.commons.lang3.NotImplementedException;

@JsonTypeName(PostAggConstants.CLASSIFICATION)
@Data
@Slf4j
public class RegressionPostAgg implements PostAgg {

  public enum NumericMetric {
    mse,
    mae,
    rmse,
    count,
  }

  private final NumericMetric metricName;

  public RegressionPostAgg(NumericMetric metricName) {
    this.metricName = metricName;
  }

  /** No-op SQL post aggregator - metrics extracted in Java. */
  @Override
  public String toSql() {
    return "agg_data";
  }

  public TimeSeriesResult extract(List<? extends Agg.Row> resultList) {
    val data = Lists.<TimeSeriesResult.MetricEntry>newArrayList();
    for (Agg.Row r : resultList) {
      val row = (Agg.BytesRow) r;
      val e = new TimeSeriesResult.MetricEntry();
      e.setTimestamp(row.getTimestamp());
      e.setLastModified(row.getLastModified());
      e.setLastModified(row.getLastModified());
      // Check if PG returned any regression metric
      if (row.getValue() != null) e.setValue(extractMetricValue(row.getValue()));
      data.add(e);
    }

    val result = new TimeSeriesResult();
    result.setStatus(QueryResultStatus.SUCCESS);
    result.setData(data);
    return result;
  }

  public Double extractMetricValue(Object columnValue) {
    return extractMetricValue((byte[]) columnValue);
  }

  @VisibleForTesting
  Double extractMetricValue(byte[] value) {
    RegressionMetrics rm;
    Double metricValue = null;
    try {
      rm = RegressionMetrics.fromProtobuf(value);
    } catch (Exception e) {
      log.error("Failed to parse regression metrics from protobuf. Skipping row.", e);
      return null;
    }

    if (rm == null) {
      return null;
    }

    switch (metricName) {
      case mse:
        metricValue = rm.mse();
        break;
      case mae:
        metricValue = rm.mae();
        break;
      case rmse:
        metricValue = rm.rmse();
        break;
      case count:
        metricValue = (double) rm.getCount();
        break;
      default:
        throw new NotImplementedException(
            String.format("regression metric \"%s\" not implemented.", metricName));
    }
    return metricValue;
  }
}
