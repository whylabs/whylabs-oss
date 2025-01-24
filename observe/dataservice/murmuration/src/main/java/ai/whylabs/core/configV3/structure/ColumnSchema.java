package ai.whylabs.core.configV3.structure;

import ai.whylabs.core.configV3.structure.enums.Classifier;
import ai.whylabs.core.configV3.structure.enums.DataType;
import ai.whylabs.core.configV3.structure.enums.DiscretenessType;
import java.util.List;
import java.util.Objects;
import lombok.*;

@Builder
@Data
@AllArgsConstructor
@NoArgsConstructor
public class ColumnSchema {

  private DiscretenessType discreteness;
  private Classifier classifier;
  private DataType dataType;
  private Boolean hidden = false;

  /**
   * Unlike most of our system, tags are more like twitter hash tags meant to classify individual
   * columns.
   */
  private List<String> tags;

  public static boolean majorUpdate(ColumnSchema col, ColumnSchema oldCol) {
    if (col != null
        && oldCol != null
        && Objects.equals(col.getDiscreteness(), oldCol.getDiscreteness())
        && Objects.equals(col.getClassifier(), oldCol.getClassifier())
        && Objects.equals(col.getDataType(), oldCol.getDataType())
        && listEncompases(oldCol.getTags(), col.getTags())) {
      return true;
    }
    return false;
  }

  public static boolean listEncompases(List<String> old, List<String> updated) {
    if (updated == null) {
      return true;
    }
    if (old == null || old.size() < updated.size()) {
      return false;
    }
    return old.containsAll(updated);
  }
}
