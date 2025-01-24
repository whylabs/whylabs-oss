package ai.whylabs.dataservice.requests;

import ai.whylabs.core.configV3.structure.TargetMatrix;
import com.fasterxml.jackson.annotation.JsonPropertyDescription;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;
import lombok.Data;

@Data
public class EvaluateTargetMatrixRequest {

  @JsonPropertyDescription("Tags on the profile")
  @Schema(required = false)
  private List<SegmentTag> profileTags;

  private TargetMatrix targetMatrix;

  private String orgId;
  private String datasetId;
}
