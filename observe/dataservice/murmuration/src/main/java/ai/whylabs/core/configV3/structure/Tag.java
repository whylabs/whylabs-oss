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
public class Tag {

  private String key;
  private String value;

  @Override
  public boolean equals(Object o) {
    if (this == o) {
      return true;
    }
    if (o == null || getClass() != o.getClass()) {
      return false;
    }
    Tag tag = (Tag) o;
    return Objects.equals(key, tag.key) && Objects.equals(value, tag.value);
  }

  @Override
  public int hashCode() {
    return Objects.hash(key, value);
  }
}
