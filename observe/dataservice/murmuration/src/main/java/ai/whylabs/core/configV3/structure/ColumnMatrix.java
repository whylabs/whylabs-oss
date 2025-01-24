package ai.whylabs.core.configV3.structure;

import ai.whylabs.core.configV3.structure.enums.TargetLevel;
import com.fasterxml.jackson.annotation.JsonIgnore;
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
public class ColumnMatrix implements TargetMatrix {

  /**
   * `include`/`exclude` = List of allowed fields/features/columns, could be a grouping as well NB
   * `exclude` is evaluated AFTER the 'include' field and thus should be used with caution.
   */
  private List<Segment> segments;

  private List<Segment> excludeSegments;

  private List<String> include;
  private List<String> exclude;

  /**
   * For adhoc specifically we allow you to specify a target matrix with a reference profile id.
   * That lets you run drift analysis between two reference profiles using the main engine.
   */
  private String profileId;

  @JsonIgnore
  public TargetLevel getLevel() {
    return TargetLevel.column;
  }

  @JsonIgnore
  public List<String> getAllowedColumns() {
    return include;
  }

  @JsonIgnore
  public List<String> getBlockedColumns() {
    return exclude;
  }
}
