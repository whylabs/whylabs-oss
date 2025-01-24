package ai.whylabs.dataservice.metrics.query;

import ai.whylabs.dataservice.metrics.agg.CustomMonitorSpec;
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
public class MonitorTimeSeriesQuery extends TimeSeriesQuery {

  BuiltinMonitorMetric metric;

  @JsonAlias("custom")
  CustomMonitorSpec customMonitorSpec;

  // May set multiple filters, combination of all non-null filters will be applied results.
  String monitorId;
  String analyzerId;

  @JsonIgnore NumericMetric custom = null; // cache of custom numeric metric

  public NumericMetric getCustom() {
    if (custom == null && customMonitorSpec != null) {
      // note - return same copy of custom metric each time this is called.
      // otherwise later equality comparisons will not work.
      custom = NumericMetric.builder().spec(customMonitorSpec).build();
    }
    return custom;
  }

  @JsonIgnore
  public List<NumericMetric> getEffectiveMetrics() {
    if (customMonitorSpec != null) {
      return ImmutableList.of(getCustom());
    }

    return metric.getMetrics();
  }

  @Override
  public void validate() {
    super.validate();
    Preconditions.checkArgument(
        (metric != null) ^ (customMonitorSpec != null), "`metric`` or `custom` is required");

    getEffectiveMetrics()
        .forEach(
            m -> {
              Preconditions.checkArgument(
                  !(columnName != null && m.getColumnName() != null),
                  "columnName and metric.columnName cannot be both specified: %s",
                  m);
              if (m.getEffectiveSpec()
                  .getSupportedLevels()
                  .contains(MetricAggregationLevel.ORGANIZATION)) {
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
