package ai.whylabs.dataservice.metrics.spec;

import ai.whylabs.dataservice.metrics.MetricQueryTypes;
import com.fasterxml.jackson.annotation.JsonSubTypes;
import com.fasterxml.jackson.annotation.JsonTypeInfo;

@JsonTypeInfo(use = JsonTypeInfo.Id.NAME, property = "type")
@JsonSubTypes({
  @JsonSubTypes.Type(value = NumericMetric.class, name = MetricQueryTypes.NUMERIC),
})
public interface Metric {
  void validate();
}
