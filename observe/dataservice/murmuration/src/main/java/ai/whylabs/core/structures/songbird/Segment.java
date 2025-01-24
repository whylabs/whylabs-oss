package ai.whylabs.core.structures.songbird;

import com.google.gson.annotations.SerializedName;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import javax.annotation.Nullable;

public class Segment {
  public static final String SERIALIZED_NAME_TAGS = "tags";

  @SerializedName("tags")
  private List<SegmentTag> tags = null;

  public Segment() {}

  public Segment tags(List<SegmentTag> tags) {
    this.tags = tags;
    return this;
  }

  public Segment addTagsItem(SegmentTag tagsItem) {
    if (this.tags == null) {
      this.tags = new ArrayList();
    }

    this.tags.add(tagsItem);
    return this;
  }

  @Nullable
  public List<SegmentTag> getTags() {
    return this.tags;
  }

  public void setTags(List<SegmentTag> tags) {
    this.tags = tags;
  }

  @Override
  public boolean equals(Object o) {
    if (this == o) return true;
    if (o == null || getClass() != o.getClass()) return false;
    Segment segment = (Segment) o;
    return Objects.equals(tags, segment.tags);
  }

  @Override
  public int hashCode() {
    return Objects.hash(tags);
  }

  public String toString() {
    StringBuilder sb = new StringBuilder();
    sb.append("class Segment {\n");
    sb.append("    tags: ").append(this.toIndentedString(this.tags)).append("\n");
    sb.append("}");
    return sb.toString();
  }

  private String toIndentedString(Object o) {
    return o == null ? "null" : o.toString().replace("\n", "\n    ");
  }
}
