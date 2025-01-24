package ai.whylabs.druid.whylogs.kll;

import ai.whylabs.druid.whylogs.util.DruidStringUtils;
import com.shaded.whylabs.org.apache.datasketches.kll.KllDoublesSketch;
import com.whylogs.core.statistics.NumberTracker;
import java.nio.charset.StandardCharsets;
import org.apache.druid.java.util.common.ISE;

public class KllDoublesSketchOperations {

  public static final KllDoublesSketch EMPTY_SKETCH = new KllDoublesSketch(256);

  public static KllDoublesSketch deserialize(final Object serializedSketch) {
    if (serializedSketch instanceof String) {
      return deserializeFromBase64EncodedString((String) serializedSketch);
    } else if (serializedSketch instanceof byte[]) {
      return deserializeFromByteArray((byte[]) serializedSketch);
    } else if (serializedSketch instanceof KllDoublesSketch) {
      return (KllDoublesSketch) serializedSketch;
    }
    throw new ISE(
        "Object is not of a type that can be deserialized to a quantiles DoublsSketch: "
            + serializedSketch.getClass());
  }

  public static KllDoublesSketch deserializeFromBase64EncodedString(final String str) {
    return deserializeFromByteArray(
        DruidStringUtils.decodeBase64(str.getBytes(StandardCharsets.UTF_8)));
  }

  public static KllDoublesSketch deserializeFromByteArray(final byte[] data) {
    return NumberTracker.deserializeKllDoubles(data);
  }
}
