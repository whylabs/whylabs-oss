package ai.whylabs.whylogsv1.metrics;

import static ai.whylabs.whylogsv1.util.SuperSimpleInternalMetrics.METRICS;

import ai.whylabs.whylogsv1.metrics.Variance.VarianceBuilder;
import com.whylogs.core.message.MetricComponentMessage;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import lombok.extern.slf4j.Slf4j;

@Slf4j
public class WhyLogMetric {

  // A Variance is a vector, but is encoded in the file as three separate scalars, which makes
  // it difficult to parse while iterating over individual elements efficiently. Use a builder
  // and construct the actual Variance after we're done...
  protected final String ColumnName;

  public WhyLogMetric(String columnName) {
    ColumnName = columnName;
  }

  /**
   * Convert a {@link MetricComponentMessage} to one or more {@link WhyLogMetric}s.
   *
   * @param columnName Column name for this metric
   * @param metricPath Metric path of this metric
   * @param metricComponentMessage Raw MetricComponentMessage
   * @return One or more WhyLogMetrics derived from the MetricComponentMessage
   */
  public static List<WhyLogMetric> whyLogMetricsFromMetricComponentMessages(
      String columnName,
      String metricPath,
      MetricComponentMessage metricComponentMessage,
      VarianceBuilder varianceBuilder) {

    List<WhyLogMetric> metrics =
        new ArrayList<>(
            1); // Most component messages only result in a single metric, but some can be two

    switch (metricPath) {
      case "types/fractional":
      case "types/integral":
      case "types/string":
      case "types/object":
      case "types/boolean":
        metrics.add(new TypeCount(columnName, metricPath, metricComponentMessage.getN()));
        METRICS().increment("metric_for_" + metricPath);
        break;
      case "counts/n":
        varianceBuilder.setCount(metricComponentMessage.getN());
        metrics.add(new CountN(columnName, metricComponentMessage.getN()));
        METRICS().increment("metric_for_" + metricPath);
        break;
      case "counts/null":
        metrics.add(new TypeCount(columnName, metricPath, metricComponentMessage.getN()));
        METRICS().increment("metric_for_" + metricPath);
        break;
      case "distribution/kll":
        metrics.add(new Kll(columnName, metricComponentMessage.getKll().getSketch()));
        METRICS().increment("metric_for_" + metricPath);
        break;
      case "distribution/mean":
        varianceBuilder.setMean(metricComponentMessage.getD());
        break;
      case "distribution/m2":
        varianceBuilder.setSum(metricComponentMessage.getD());
        break;
      case "frequent_items/frequent_strings":
        metrics.add(
            new FrequentStrings(columnName, metricComponentMessage.getFrequentItems().getSketch()));
        METRICS().increment("metric_for_" + metricPath);
        break;
      case "cardinality/hll":
        metrics.add(new Hll(columnName, metricComponentMessage.getFrequentItems().getSketch()));
        METRICS().increment("metric_for_" + metricPath);
        break;

      default:
        log.debug("Unsupported metric path: {}", metricPath);
        METRICS().increment("unsupported_metric_" + metricPath);
    }

    return metrics;
  }

  @Override
  public boolean equals(Object o) {
    if (this == o) {
      return true;
    }
    if (o == null || getClass() != o.getClass()) {
      return false;
    }
    WhyLogMetric that = (WhyLogMetric) o;
    return ColumnName.equals(that.ColumnName);
  }

  @Override
  public int hashCode() {
    return Objects.hash(ColumnName);
  }

  public String getColumnName() {
    return ColumnName;
  }

  @Override
  public String toString() {
    return "WhyLogMetric{" + "ColumnName='" + ColumnName + '\'' + '}';
  }
}
