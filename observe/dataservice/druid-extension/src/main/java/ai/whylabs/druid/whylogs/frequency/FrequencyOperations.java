package ai.whylabs.druid.whylogs.frequency;

import ai.whylabs.druid.whylogs.util.DruidStringUtils;
import com.shaded.whylabs.org.apache.datasketches.ArrayOfStringsSerDe;
import com.shaded.whylabs.org.apache.datasketches.frequencies.ItemsSketch;
import com.shaded.whylabs.org.apache.datasketches.memory.Memory;
import com.whylogs.core.utils.sketches.FrequentStringsSketch;
import java.nio.charset.StandardCharsets;
import javax.annotation.Nonnull;
import org.apache.druid.java.util.common.ISE;

/** A set of serialization helper functions for working with ItemsSketch */
public class FrequencyOperations {

  public static final StringItemSketch EMPTY_COLUMN =
      new StringItemSketch(FrequentStringsSketch.create());
  private static final ArrayOfStringsSerDe serde = new ArrayOfStringsSerDe();

  public static StringItemSketch deserialize(final Object obj) {
    if (obj instanceof String) {
      return deserializeFromBase64EncodedString((String) obj);
    } else if (obj instanceof byte[]) {
      return deserializeFromByteArray((byte[]) obj);
    } else if (obj instanceof StringItemSketch) {
      return (StringItemSketch) obj;
    }
    throw new ISE(
        "Object is not of a type that can be deserialized to a quantiles ColumnProfile: "
            + obj.getClass());
  }

  public static StringItemSketch deserializeFromBase64EncodedString(final String str) {
    final byte[] bytes = DruidStringUtils.decodeBase64(str.getBytes(StandardCharsets.UTF_8));
    return deserializeFromByteArray(bytes);
  }

  @Nonnull
  public static StringItemSketch deserializeFromByteArray(byte[] bytes) {
    return new StringItemSketch(ItemsSketch.getInstance(Memory.wrap(bytes), serde));
  }

  public static byte[] serialize(ItemsSketch<String> sketch) {
    return serialize(new StringItemSketch(sketch));
  }

  public static byte[] serialize(StringItemSketch stringItemSketch) {
    return stringItemSketch.get().toByteArray(serde);
  }
}
