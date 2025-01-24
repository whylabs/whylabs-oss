package ai.whylabs.dataservice.requests;

import com.fasterxml.jackson.annotation.JsonPropertyDescription;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

@Data
public class DiagnosticAnalyzersRequest {
  @JsonPropertyDescription("Required, orgId")
  @Schema(required = true)
  private String orgId;

  @JsonPropertyDescription("Required, datasetId")
  @Schema(required = true)
  private String datasetId;

  @JsonPropertyDescription("Required, diagnose within this ISO-8601 time period")
  @Schema(required = true, type = "string")
  private String interval;
}
