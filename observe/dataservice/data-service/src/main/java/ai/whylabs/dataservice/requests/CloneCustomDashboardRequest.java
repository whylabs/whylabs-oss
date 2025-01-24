package ai.whylabs.dataservice.requests;

import com.fasterxml.jackson.annotation.JsonPropertyDescription;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

@Data
public class CloneCustomDashboardRequest {
  @JsonPropertyDescription("Required, id")
  @Schema(required = true)
  private String id;

  @JsonPropertyDescription("Required, author")
  @Schema(required = true)
  private String author;
}
