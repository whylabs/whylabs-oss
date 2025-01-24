package ai.whylabs.dataservice.requests;

import com.fasterxml.jackson.annotation.JsonPropertyDescription;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode
public class GetEntitySchemaRequest {

  @JsonPropertyDescription("Required, orgId")
  @Schema(required = true)
  private String orgId;

  @JsonPropertyDescription("Required, datasetIds")
  @Schema(required = true)
  private String datasetId;

  @JsonPropertyDescription("Whether to return hidden columns or not ")
  @Schema(required = false)
  private boolean includeHidden = false;

  @JsonPropertyDescription(
      "Want it to be faster and more concurrent? Flip on to enable hitting read replicas")
  @Schema(required = false)
  private boolean eventuallyConsistent = false;
}
