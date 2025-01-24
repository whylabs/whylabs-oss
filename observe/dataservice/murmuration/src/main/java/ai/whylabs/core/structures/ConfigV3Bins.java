package ai.whylabs.core.structures;

import ai.whylabs.core.configV3.structure.Segment;
import java.io.Serializable;
import java.util.List;
import java.util.Set;
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
public class ConfigV3Bins implements Serializable {
  private String confOrgId;
  private String confDatasetId;
  private List<Long> bins;
  private List<String> baselines;
  private Set<Segment> segments;
}
