package ai.whylabs.core.configV3.structure;

import java.util.Objects;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Builder
@Data
@AllArgsConstructor
@NoArgsConstructor
public class Metadata {
  private Integer version;
  private Integer schemaVersion;
  private Long updatedTimestamp;
  private String author;
  private String description;

  public static boolean majorUpdate(EntitySchema updated, EntitySchema old) {
    if (updated == null || updated.getMetadata() == null) {
      return false;
    }
    if (old == null || old.getMetadata() == null) {
      return true;
    }
    if (!Objects.equals(updated.getMetadata().author, old.getMetadata().author)
        || !Objects.equals(updated.getMetadata().description, old.getMetadata().description)) {
      return true;
    }
    return false;
  }
}
