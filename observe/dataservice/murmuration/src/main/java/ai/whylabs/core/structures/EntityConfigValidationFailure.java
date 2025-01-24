package ai.whylabs.core.structures;

import java.io.Serializable;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldNameConstants;

@FieldNameConstants
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EntityConfigValidationFailure implements Serializable {
  private String orgId;
  private String datasetId;
  private List<String> analyzerIds;
}
