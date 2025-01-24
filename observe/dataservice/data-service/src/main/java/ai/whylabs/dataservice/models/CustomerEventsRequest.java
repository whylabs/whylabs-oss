package ai.whylabs.dataservice.models;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Builder(toBuilder = true)
@Data
@EqualsAndHashCode
public class CustomerEventsRequest {
  @Schema(description = "Start time in milliseconds")
  Long startDate;

  @Schema(description = "End time in milliseconds")
  Long endDate;

  @Schema(description = "Limit the number of events returned")
  Integer limit;

  @Schema(description = "Offset the events returned")
  Integer offset;
}
