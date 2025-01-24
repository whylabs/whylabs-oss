package ai.whylabs.druid.whylogs.variance;

import ai.whylabs.druid.whylogs.util.DruidStringUtils;
import com.whylogs.core.statistics.datatypes.VarianceTracker;
import com.whylogs.v0.core.message.VarianceMessage;
import it.unimi.dsi.fastutil.bytes.ByteArrays;
import java.nio.charset.StandardCharsets;
import lombok.extern.slf4j.Slf4j;
import org.apache.druid.java.util.common.ISE;

@Slf4j
public class VarianceOperations {
  public static final VarianceTracker EMPTY_TRACKER = new VarianceTracker();

  public static VarianceTracker deserialize(final Object obj) {
    if (obj instanceof String) {
      return deserializeFromBase64EncodedString((String) obj);
    } else if (obj instanceof byte[]) {
      return deserializeFromByteArray((byte[]) obj);
    } else if (obj instanceof VarianceTracker) {
      return (VarianceTracker) obj;
    } else if (obj == null) {
      return EMPTY_TRACKER;
    }
    throw new ISE(
        "Object is not of a type that can be deserialized to a VarianceTracker: " + obj.getClass());
  }

  public static VarianceTracker deserializeFromBase64EncodedString(final String str) {
    return deserializeFromByteArray(
        DruidStringUtils.decodeBase64(str.getBytes(StandardCharsets.UTF_8)));
  }

  public static VarianceTracker deserializeFromByteArray(final byte[] bytes) {
    try {
      log.trace("VarianceOperations Operations.deserializeFromByteArray {} bytes}", bytes.length);
      if (bytes.length == 0) {
        return new VarianceTracker();
      }
      return VarianceTracker.fromProtobuf(VarianceMessage.parseFrom(bytes));
    } catch (Exception e) {
      throw new RuntimeException(e);
    }
  }

  public static byte[] serialize(VarianceTracker v) {
    if (v == null) {
      return ByteArrays.EMPTY_ARRAY;
    }
    return v.toProtobuf().build().toByteArray();
  }
}
