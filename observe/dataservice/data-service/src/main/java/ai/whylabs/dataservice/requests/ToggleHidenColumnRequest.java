package ai.whylabs.dataservice.requests;

import com.fasterxml.jackson.annotation.JsonPropertyDescription;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

@Data
public class ToggleHidenColumnRequest {
  @JsonPropertyDescription("Required, orgId")
  @Schema(required = true)
  private String orgId;

  @JsonPropertyDescription("Required, datasetIds")
  @Schema(required = true)
  private String datasetId;

  @JsonPropertyDescription("Required, name of column to hide")
  @Schema(required = true)
  private String columnName;
}
