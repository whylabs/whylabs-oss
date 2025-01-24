package ai.whylabs.core.configV3.structure;

import java.util.List;
import java.util.Objects;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Builder
@Data
@AllArgsConstructor
@NoArgsConstructor
public class Segment {

  // Must supply an empty tag kv entry to enable overall   {,}
  private List<Tag> tags;

  @Override
  public boolean equals(Object o) {
    if (this == o) {
      return true;
    }
    if (o == null || getClass() != o.getClass()) {
      return false;
    }
    Segment segment = (Segment) o;
    return Objects.equals(tags, segment.tags);
  }

  @Override
  public int hashCode() {
    return Objects.hash(tags);
  }
}
