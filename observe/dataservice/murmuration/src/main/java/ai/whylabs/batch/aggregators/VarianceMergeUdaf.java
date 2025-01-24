package ai.whylabs.batch.aggregators;

import com.shaded.whylabs.com.google.protobuf.InvalidProtocolBufferException;
import com.whylogs.core.statistics.datatypes.VarianceTracker;
import com.whylogs.v0.core.message.VarianceMessage;
import lombok.val;
import org.apache.spark.sql.Encoder;
import org.apache.spark.sql.Encoders;
import org.apache.spark.sql.expressions.Aggregator;

public class VarianceMergeUdaf extends Aggregator<byte[], byte[], byte[]> {
  public static final String UDAF_NAME = "varianceMerge";

  @Override
  public byte[] zero() {
    return new byte[0];
  }

  @Override
  public byte[] reduce(byte[] a, byte[] b) {
    val left = fromProtobuf(a);
    val right = fromProtobuf(b);

    if (left == null) {
      return b;
    } else if (right == null) {
      return a;
    }
    return left.merge(right).toProtobuf().build().toByteArray();
  }

  public static final VarianceTracker fromProtobuf(byte[] bytes) {
    if (bytes == null || bytes.length == 0) {
      return null;
    }
    try {
      return VarianceTracker.fromProtobuf(VarianceMessage.parseFrom(bytes));
    } catch (InvalidProtocolBufferException e) {
      throw new RuntimeException(e);
    }
  }

  @Override
  public byte[] merge(byte[] a, byte[] b) {
    return reduce(a, b);
  }

  @Override
  public byte[] finish(byte[] reduction) {
    return reduction;
  }

  public Encoder<byte[]> bufferEncoder() {
    return Encoders.BINARY();
  }

  @Override
  public Encoder<byte[]> outputEncoder() {
    return Encoders.BINARY();
  }
}
