package ai.whylabs.core.configV3.structure;

import ai.whylabs.core.configV3.structure.enums.TargetLevel;
import java.util.Arrays;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.ToString;
import lombok.experimental.FieldNameConstants;

@FieldNameConstants
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@ToString
public class DatasetMatrix implements TargetMatrix {
  static List<String> allowed = Arrays.asList("__internal__.datasetMetrics");

  private List<Segment> segments;
  private List<Segment> excludeSegments;
  private String profileId;

  public TargetLevel getLevel() {
    return TargetLevel.dataset;
  }

  public List<String> getAllowedColumns() {
    return allowed;
  }

  public List<String> getBlockedColumns() {
    return null;
  }
}
