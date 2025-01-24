package ai.whylabs.dataservice.requests;

import ai.whylabs.dataservice.util.ValidateRequest;
import com.fasterxml.jackson.annotation.JsonPropertyDescription;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.*;
import org.joda.time.Interval;

@Builder
@Data
@AllArgsConstructor
@NoArgsConstructor
public class GetTracesRequest {
  @Schema(required = true)
  private String orgId;

  @Schema(required = true)
  private String datasetId;

  @Schema(type = "string")
  private Interval interval; //  ISO 8601 formatted interval

  @JsonPropertyDescription("Limit as per sql definition, max " + ValidateRequest.MAX_PAGE_SIZE)
  @Schema(
      type = "integer",
      minimum = "1",
      maximum = "" + ValidateRequest.MAX_PAGE_SIZE,
      defaultValue = "50")
  private Integer limit = 50;

  @JsonPropertyDescription("Offset as per sql definition, max " + ValidateRequest.MAX_OFFSET)
  @Schema(
      type = "integer",
      minimum = "0",
      maximum = "" + ValidateRequest.MAX_OFFSET,
      defaultValue = "0")
  private Integer offset = 0;

  @Schema(type = "string")
  private String traceId;
}
