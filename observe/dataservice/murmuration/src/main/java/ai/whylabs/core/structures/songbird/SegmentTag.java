package ai.whylabs.core.structures.songbird;

import com.google.gson.annotations.SerializedName;
import java.util.Objects;
import javax.annotation.Nullable;

public class SegmentTag {
  public static final String SERIALIZED_NAME_KEY = "key";

  @SerializedName("key")
  private String key;

  public static final String SERIALIZED_NAME_VALUE = "value";

  @SerializedName("value")
  private String value;

  public SegmentTag() {}

  public SegmentTag key(String key) {
    this.key = key;
    return this;
  }

  @Nullable
  public String getKey() {
    return this.key;
  }

  public void setKey(String key) {
    this.key = key;
  }

  public SegmentTag value(String value) {
    this.value = value;
    return this;
  }

  @Nullable
  public String getValue() {
    return this.value;
  }

  public void setValue(String value) {
    this.value = value;
  }

  @Override
  public boolean equals(Object o) {
    if (this == o) return true;
    if (o == null || getClass() != o.getClass()) return false;
    SegmentTag that = (SegmentTag) o;
    return Objects.equals(key, that.key) && Objects.equals(value, that.value);
  }

  @Override
  public int hashCode() {
    return Objects.hash(key, value);
  }

  private String toIndentedString(Object o) {
    return o == null ? "null" : o.toString().replace("\n", "\n    ");
  }
}
