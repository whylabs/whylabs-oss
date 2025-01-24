package ai.whylabs.dataservice.requests;

import ai.whylabs.dataservice.util.ValidateRequest;
import com.fasterxml.jackson.annotation.JsonPropertyDescription;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.experimental.FieldNameConstants;

@FieldNameConstants
@Data
public class TagListRequest {

  @JsonPropertyDescription("Required, orgId")
  @Schema(required = true)
  private String orgId;

  @JsonPropertyDescription("Required, datasetId")
  @Schema(required = true)
  private String datasetId;

  @JsonPropertyDescription("Limit as per sql definition, max " + ValidateRequest.MAX_PAGE_SIZE)
  private Integer limit = ValidateRequest.MAX_PAGE_SIZE;

  @JsonPropertyDescription("Offset as per sql definition")
  private Integer offset = 0;
}
