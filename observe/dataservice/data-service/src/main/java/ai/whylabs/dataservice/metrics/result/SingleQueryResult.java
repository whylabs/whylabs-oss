package ai.whylabs.dataservice.metrics.result;

import ai.whylabs.dataservice.metrics.MetricConstants;
import com.fasterxml.jackson.annotation.JsonSubTypes;
import com.fasterxml.jackson.annotation.JsonTypeInfo;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;
import lombok.Data;

@JsonTypeInfo(use = JsonTypeInfo.Id.NAME, property = "type")
@JsonSubTypes({
  @JsonSubTypes.Type(value = TimeSeriesResult.class, name = MetricConstants.TIMESERIES),
})
@Data
@Schema(requiredProperties = "type")
public abstract class SingleQueryResult {
  String id;
  QueryResultStatus status;
  String errorCode;
  List<String> errorMessages;
}
