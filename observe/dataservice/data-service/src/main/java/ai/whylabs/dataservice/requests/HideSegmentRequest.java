package ai.whylabs.dataservice.requests;

import com.fasterxml.jackson.annotation.JsonPropertyDescription;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

@Data
public class HideSegmentRequest {
  @JsonPropertyDescription("Required, orgId")
  @Schema(required = true)
  private String orgId;

  @JsonPropertyDescription("Required, datasetIds")
  @Schema(required = true)
  private String datasetId;

  @JsonPropertyDescription("Required, segmentText")
  @Schema(required = true)
  private String segment;
}
