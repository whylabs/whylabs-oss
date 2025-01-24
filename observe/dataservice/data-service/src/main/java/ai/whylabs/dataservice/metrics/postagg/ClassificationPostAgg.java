package ai.whylabs.dataservice.metrics.postagg;

import ai.whylabs.dataservice.metrics.agg.Agg;
import ai.whylabs.dataservice.metrics.result.QueryResultStatus;
import ai.whylabs.dataservice.metrics.result.TimeSeriesResult;
import ai.whylabs.dataservice.services.ClassificationMetrics;
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
public class ClassificationPostAgg implements PostAgg {

  public enum NumericMetric {
    accuracy,
    recall,
    fpr,
    precision,
    f1,
    auc,
    count
  }

  private final NumericMetric metricName;

  public ClassificationPostAgg(NumericMetric metricName) {
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
      // Check if PG returned any classification metric
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
    ClassificationMetrics cm;
    Double metricValue = null;
    try {
      cm = ClassificationMetrics.fromProtobuf(value);
    } catch (Exception e) {
      log.error("Failed to parse classification metrics from protobuf. Skipping row.", e);
      return null;
    }

    if (cm == null) {
      return null;
    }

    switch (metricName) {
      case accuracy:
        metricValue = cm.toMetricValues().getAccuracy();
        break;
      case recall:
        metricValue = cm.toMetricValues().getRecall();
        break;
      case fpr:
        metricValue = cm.toMetricValues().getFpr();
        break;
      case precision:
        metricValue = cm.toMetricValues().getPrecision();
        break;
      case f1:
        metricValue = cm.toMetricValues().getF1();
        break;
      case auc:
        metricValue = cm.toMetricValues().getMacroAuc();
        break;
      case count:
        val confusion = cm.getConfusionMatrix();
        long total = 0;
        for (int i = 0; i < confusion.length; i++) {
          for (int j = 0; j < confusion[i].length; j++) {
            total += confusion[i][j];
          }
        }
        metricValue = (double) total;
        break;
      default:
        throw new NotImplementedException(
            String.format("classification metric \"%s\" not implemented.", metricName));
    }
    return metricValue;
  }
}
