package ai.whylabs.druid.whylogs.modelmetrics;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.google.common.base.Preconditions;
import java.util.Comparator;
import java.util.Map;
import java.util.Set;
import javax.annotation.Nullable;
import org.apache.druid.query.Queries;
import org.apache.druid.query.aggregation.PostAggregator;
import org.apache.druid.segment.column.ValueType;

public class DerivedMetricsPostAggregator implements PostAggregator {

  private final String name;
  private final PostAggregator field;
  private final String metricType;

  @JsonCreator
  public DerivedMetricsPostAggregator(
      @JsonProperty("name") final String name,
      @JsonProperty("field") final PostAggregator field,
      @JsonProperty("metricType") final String metricType) {
    this.name = Preconditions.checkNotNull(name, "name is null");
    this.field = Preconditions.checkNotNull(field, "field is null");
    this.metricType = Preconditions.checkNotNull(metricType, "metricType is null");
  }

  @Override
  public Set<String> getDependentFields() {
    return field.getDependentFields();
  }

  @Override
  public Comparator getComparator() {
    return null;
  }

  @Nullable
  @Override
  public Object compute(Map<String, Object> combinedAggregators) {
    final DruidModelMetrics dmm = (DruidModelMetrics) field.compute(combinedAggregators);
    if (dmm == null) {
      return null;
    }

    switch (metricType) {
      case "mean_squared_error":
        return dmm.meanSquaredError();
      case "count":
        return dmm.count();
      case "mean_absolute_error":
        return dmm.meanAbsoluteError();
      case "root_mean_squared_error":
        return dmm.rootMeanSquaredError();
      case "recall":
        return dmm.getRecall();
      case "fpr":
        return dmm.getFpr();
      case "precision":
        return dmm.getPrecision();
      case "accuracy":
        return dmm.getAccuracy();
      case "f1":
        return dmm.getF1();
      case "auroc":
        return dmm.getAuROC();
      default:
        throw new UnsupportedOperationException(
            "unrecognized derived metric \"{}\"".format(metricType));
    }
  }

  /**
   * Return the output type of a row processed with this post aggregator. Refer to the {@link
   * ValueType} javadocs for details on the implications of choosing a type.
   */
  @Nullable
  @Override
  public ValueType getType() {
    return ValueType.DOUBLE;
  }

  @JsonProperty
  public PostAggregator getField() {
    return field;
  }

  @Override
  @JsonProperty
  public String getName() {
    return name;
  }

  @JsonProperty
  @JsonInclude(JsonInclude.Include.NON_NULL)
  public String getMetricType() {
    return metricType;
  }

  /**
   * Allows returning an enriched post aggregator, built from contextual information available from
   * the given map of {@link AggregatorFactory} keyed by their names. Callers must call this method
   * before calling {@link #compute} or {@link #getComparator}. This is typically done in the
   * constructor of queries which support post aggregators, via {@link Queries#prepareAggregations}.
   */
  @Override
  public PostAggregator decorate(
      final Map<String, org.apache.druid.query.aggregation.AggregatorFactory> map) {
    return this;
  }

  /**
   * Get a byte array used as a cache key.
   *
   * @return a cache key
   */
  @Override
  public byte[] getCacheKey() {
    return new byte[0];
  }
}
