package ai.whylabs.dataservice.metrics.spec;

import ai.whylabs.dataservice.metrics.MetricQueryTypes;
import ai.whylabs.dataservice.metrics.agg.CustomSpec;
import ai.whylabs.dataservice.metrics.agg.MetricAggregationLevel;
import ai.whylabs.dataservice.metrics.agg.Spec;
import ai.whylabs.dataservice.metrics.result.QueryResultStatus;
import ai.whylabs.dataservice.metrics.result.TimeSeriesResult;
import com.clearspring.analytics.util.Lists;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonTypeName;
import com.google.common.base.Preconditions;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;
import lombok.*;

@JsonTypeName(MetricQueryTypes.NUMERIC)
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Data
public class NumericMetric implements Metric {

  @Schema(description = "Optional, custom aggregation")
  Spec spec;

  @Schema(description = "Optional, custom aggregation")
  CustomSpec custom;

  @Schema(
      description =
          "Optional, filter to apply to the metric to a specific column. Cannot specify at query level if this value is set")
  String columnName;

  String monitorId;
  String monitorMetric;
  @JsonIgnore @Builder.Default Boolean hidden = false;

  @JsonIgnore
  public Spec getEffectiveSpec() {
    return spec == null ? custom : spec;
  }

  @JsonIgnore
  public void validate() {
    Preconditions.checkArgument(
        spec == null ^ custom == null, "Must specify either metric or customMetric");

    if (getEffectiveSpec().getSupportedLevels().contains(MetricAggregationLevel.COLUMN)
        && columnName != null) {
      throw new IllegalArgumentException("Cannot specify columnName for non-resource level metric");
    }

    //    if (getEffectiveSpec().getDatasource() == Datasource.monitors) {
    //      Preconditions.checkArgument(
    //          monitorId != null, "monitorId in filter is required for monitors datasource");
    //      Preconditions.checkArgument(
    //          monitorMetric != null, "monitorMetric in filter is required for monitors
    // datasource");
    //    }
  }

  @JsonIgnore
  public Class<?> getResultClass() {
    return TimeSeriesResult.MetricEntry.class;
  }

  public TimeSeriesResult extract(List<TimeSeriesResult.MetricEntry> resultList) {
    val data = Lists.<TimeSeriesResult.MetricEntry>newArrayList();

    resultList.stream().map((Object o) -> (TimeSeriesResult.MetricEntry) o).forEach(data::add);

    val result = new TimeSeriesResult();
    result.setStatus(QueryResultStatus.SUCCESS);
    result.setData(data);
    return result;
  }
}
