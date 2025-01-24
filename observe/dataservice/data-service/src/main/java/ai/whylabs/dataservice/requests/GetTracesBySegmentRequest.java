package ai.whylabs.dataservice.requests;

import ai.whylabs.dataservice.util.ValidateRequest;
import com.fasterxml.jackson.annotation.JsonPropertyDescription;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.joda.time.Interval;

@Builder
@Data
@AllArgsConstructor
@NoArgsConstructor
public class GetTracesBySegmentRequest {
  @Schema(required = true)
  private String orgId;

  @Schema(required = true)
  private String datasetId;

  @Schema(type = "string")
  private Interval interval; //  ISO 8601 formatted interval

  @JsonPropertyDescription("Optional, list of segment tags to match")
  @Schema(required = false)
  private List<SegmentTag> segment;

  @JsonPropertyDescription("Limit as per sql definition, max " + ValidateRequest.MAX_PAGE_SIZE)
  @Schema(
      type = "integer",
      minimum = "1",
      maximum = "" + ValidateRequest.MAX_PAGE_SIZE,
      defaultValue = "50")
  @Builder.Default
  private Integer limit = 50;

  @JsonPropertyDescription("Offset as per sql definition, max " + ValidateRequest.MAX_OFFSET)
  @Schema(
      type = "integer",
      minimum = "0",
      maximum = "" + ValidateRequest.MAX_OFFSET,
      defaultValue = "0")
  @Builder.Default
  private Integer offset = 0;
}
