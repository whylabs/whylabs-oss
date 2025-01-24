package ai.whylabs.dataservice.responses;

import ai.whylabs.dataservice.requests.ResourceTag;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldNameConstants;

@FieldNameConstants
@Builder
@Data
@AllArgsConstructor
@NoArgsConstructor
public class ValidateResourceTagConfigurationResponse {
  private boolean valid;

  private List<ResourceTag> droppedTagsInUse;
}
