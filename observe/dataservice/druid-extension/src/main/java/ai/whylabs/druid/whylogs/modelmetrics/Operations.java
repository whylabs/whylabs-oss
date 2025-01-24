package ai.whylabs.druid.whylogs.modelmetrics;

import ai.whylabs.druid.whylogs.util.DruidStringUtils;
import com.shaded.whylabs.com.google.protobuf.InvalidProtocolBufferException;
import com.whylogs.v0.core.message.ModelMetricsMessage;
import it.unimi.dsi.fastutil.bytes.ByteArrays;
import java.nio.charset.StandardCharsets;
import javax.annotation.Nonnull;
import lombok.extern.slf4j.Slf4j;
import org.apache.druid.java.util.common.ISE;

@Slf4j
public class Operations {

  public static final DruidModelMetrics EMPTY_COLUMN = new DruidModelMetrics(null);

  public static DruidModelMetrics deserialize(final Object obj) {
    if (obj instanceof String) {
      return deserializeFromBase64EncodedString((String) obj);
    } else if (obj instanceof byte[]) {
      return deserializeFromByteArray((byte[]) obj);
    } else if (obj instanceof DruidModelMetrics) {
      return (DruidModelMetrics) obj;
    } else if (obj == null) {
      return EMPTY_COLUMN;
    }
    throw new ISE(
        "Object is not of a type that can be deserialized to a DruidModelMetrics: "
            + obj.getClass());
  }

  public static DruidModelMetrics deserializeFromBase64EncodedString(final String str) {
    return deserializeFromByteArray(
        DruidStringUtils.decodeBase64(str.getBytes(StandardCharsets.UTF_8)));
  }

  @Nonnull
  private static DruidModelMetrics deserializeFromByteArray(byte[] bytes) {
    try {
      log.trace("DruidModelMetrics Operations.deserializeFromByteArray {} bytes}", bytes.length);
      if (bytes.length == 0) {
        return new DruidModelMetrics(null);
      }
      return DruidModelMetrics.fromProtobuf(ModelMetricsMessage.parseFrom(bytes));
    } catch (InvalidProtocolBufferException e) {
      throw new RuntimeException(e);
    }
  }

  public static byte[] serialize(DruidModelMetrics metric) {
    if (metric == null) {
      return ByteArrays.EMPTY_ARRAY;
    }
    return metric.toProtobuf().build().toByteArray();
  }
}
