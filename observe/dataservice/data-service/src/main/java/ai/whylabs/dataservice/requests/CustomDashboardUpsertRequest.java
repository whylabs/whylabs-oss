package ai.whylabs.dataservice.requests;

import com.fasterxml.jackson.annotation.JsonPropertyDescription;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

@Data
public class CustomDashboardUpsertRequest {
  @JsonPropertyDescription("Optional, id for update only")
  @Schema(required = false)
  private String id;

  @JsonPropertyDescription("The user who created the dashboard")
  @Schema(required = false)
  private String author;

  @JsonPropertyDescription("The friendly dashboard's name")
  @Schema(required = false)
  private String displayName;

  @JsonPropertyDescription("The object that has the dashboard config")
  @Schema(required = false)
  private String schema;

  @JsonPropertyDescription("Flag to mark dashboard as favorite")
  @Schema(required = false)
  private Boolean isFavorite;
}
