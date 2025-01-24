package ai.whylabs.druid.whylogs.modelmetrics;

import com.shaded.whylabs.com.google.protobuf.InvalidProtocolBufferException;
import com.whylogs.core.metrics.ModelMetrics;
import com.whylogs.v0.core.message.ModelMetricsMessage;
import it.unimi.dsi.fastutil.bytes.ByteArrays;
import java.nio.ByteBuffer;
import lombok.val;

public class ObjectStrategy
    implements org.apache.druid.segment.data.ObjectStrategy<DruidModelMetrics> {

  /**
   * Compares its two arguments for order. Returns a negative integer, zero, or a positive integer
   * as the first argument is less than, equal to, or greater than the second.
   *
   * <p>Params: s1 – the first object to be compared. s2 – the second object to be compared.
   *
   * <p>Returns: a negative integer, zero, or a positive integer as the first argument is less than,
   * equal to, or greater than the second.
   *
   * <p>Throws: NullPointerException – if an argument is null and this comparator does not permit
   * null arguments ClassCastException – if the arguments' types prevent them from being compared by
   * this comparator.
   */
  @Override
  public int compare(final DruidModelMetrics s1, final DruidModelMetrics s2) {
    return AggregatorFactory.COMPARATOR.compare(s1, s2);
  }

  @Override
  public DruidModelMetrics fromByteBuffer(final ByteBuffer buffer, final int numBytes) {
    if (numBytes == 0) {
      return Operations.EMPTY_COLUMN;
    }

    final byte[] bytes = new byte[numBytes];
    buffer.get(bytes, 0, numBytes);
    try {
      val msg = ModelMetricsMessage.parseFrom(bytes);
      val mm = ModelMetrics.fromProtobuf(msg);
      return new DruidModelMetrics(mm);
    } catch (InvalidProtocolBufferException e) {
      throw new RuntimeException(e);
    }
  }

  @Override
  public Class<DruidModelMetrics> getClazz() {
    return DruidModelMetrics.class;
  }

  @Override
  public byte[] toBytes(final DruidModelMetrics metrics) {
    if (metrics == null) {
      return ByteArrays.EMPTY_ARRAY;
    }
    return metrics.toProtobuf().build().toByteArray();
  }
}
