package ai.whylabs.dataservice.metrics.query;

import ai.whylabs.dataservice.metrics.agg.CustomProfileSpec;
import ai.whylabs.dataservice.metrics.agg.MetricAggregationLevel;
import ai.whylabs.dataservice.metrics.spec.*;
import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.google.common.base.Preconditions;
import com.google.common.collect.ImmutableList;
import java.util.List;
import lombok.Data;
import lombok.EqualsAndHashCode;

@EqualsAndHashCode(callSuper = true)
@Data
public class ProfileTimeSeriesQuery extends TimeSeriesQuery {
  BuiltinProfileMetric metric;

  @JsonAlias("custom")
  CustomProfileSpec customProfileSpec;

  @JsonIgnore NumericMetric custom = null; // cache of custom numeric metric

  public NumericMetric getCustom() {
    if (custom == null && customProfileSpec != null) {
      // note - return same copy of custom metric each time this is called.
      // otherwise later equality comparisons will not work.
      custom = NumericMetric.builder().spec(customProfileSpec).build();
    }
    return custom;
  }

  @JsonIgnore
  public List<NumericMetric> getEffectiveMetrics() {
    if (customProfileSpec != null) {
      return ImmutableList.of(getCustom());
    }

    return metric.getMetrics();
  }

  @Override
  public void validate() {
    super.validate();
    Preconditions.checkArgument(
        (metric != null) ^ (customProfileSpec != null), "`metric` or `custom` is required");

    getEffectiveMetrics()
        .forEach(
            m -> {
              Preconditions.checkArgument(
                  !(columnName != null && m.getColumnName() != null),
                  "columnName and metric.columnName cannot be both specified: %s",
                  m);
              if (m.getEffectiveSpec()
                  .getSupportedLevels()
                  .contains(MetricAggregationLevel.RESOURCE)) {
                Preconditions.checkArgument(resourceId != null, "resourceId is required");
              }
              if (m.getEffectiveSpec()
                  .getSupportedLevels()
                  .contains(MetricAggregationLevel.COLUMN)) {
                Preconditions.checkArgument(resourceId != null, "resourceId is required");
              }
            });

    if (resourceId == null && (segment != null && !segment.isEmpty())) {
      throw new IllegalArgumentException("Cannot specify segment without resourceId");
    }
  }
}
