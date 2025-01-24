package ai.whylabs.dataservice.metrics.postagg;

import ai.whylabs.dataservice.metrics.agg.Agg;
import ai.whylabs.dataservice.metrics.result.QueryResultStatus;
import ai.whylabs.dataservice.metrics.result.TimeSeriesResult;
import com.clearspring.analytics.util.Lists;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonSubTypes;
import com.fasterxml.jackson.annotation.JsonTypeInfo;
import io.swagger.v3.oas.annotations.media.Schema;
import java.math.BigDecimal;
import java.util.List;
import lombok.val;

@JsonTypeInfo(use = JsonTypeInfo.Id.NAME, property = "type")
@JsonSubTypes({
  @JsonSubTypes.Type(value = QuantilePostAgg.class, name = PostAggConstants.QUANTILE),
  @JsonSubTypes.Type(value = UniqueEstPostAgg.class, name = PostAggConstants.UNIQUE_EST),
  @JsonSubTypes.Type(value = NoopPostAgg.class, name = PostAggConstants.NOOP),
})
@Schema(requiredProperties = "type")
public interface PostAgg {

  @JsonIgnore
  String toSql();

  default TimeSeriesResult extract(List<? extends Agg.Row> resultList) {
    val data = Lists.<TimeSeriesResult.MetricEntry>newArrayList();

    resultList.stream()
        .map(o -> new TimeSeriesResult.MetricEntry((Agg.NumericRow) o))
        .forEach(data::add);

    val result = new TimeSeriesResult();
    result.setStatus(QueryResultStatus.SUCCESS);
    result.setData(data);
    return result;
  }

  default Double extractMetricValue(Object columnValue) {
    try {
      if (columnValue instanceof BigDecimal) {
        return ((BigDecimal) columnValue).doubleValue();
      }
      return (Double) columnValue;
    } catch (Exception e) {
      throw new IllegalStateException("Cannot cast to double, need special conversion handling");
    }
  }
}
