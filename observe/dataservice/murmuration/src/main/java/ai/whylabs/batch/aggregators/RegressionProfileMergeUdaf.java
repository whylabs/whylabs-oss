package ai.whylabs.batch.aggregators;

import com.shaded.whylabs.com.google.protobuf.InvalidProtocolBufferException;
import com.whylogs.core.metrics.RegressionMetrics;
import com.whylogs.v0.core.message.RegressionMetricsMessage;
import lombok.val;
import org.apache.spark.sql.Encoder;
import org.apache.spark.sql.Encoders;
import org.apache.spark.sql.expressions.Aggregator;

public class RegressionProfileMergeUdaf extends Aggregator<byte[], byte[], byte[]> {
  public static final String UDAF_NAME = "mergeRegressionProfile";

  @Override
  public byte[] zero() {
    return new byte[0];
  }

  @Override
  public byte[] reduce(byte[] a, byte[] b) {
    return merge(a, b);
  }

  @Override
  public byte[] merge(byte[] a, byte[] b) {
    return mergeRegression(a, b);
  }

  public static byte[] mergeRegression(byte[] a, byte[] b) {
    val left = fromProtobuf(a);
    val right = fromProtobuf(b);

    if (left == null) {
      return b;
    } else if (right == null) {
      return a;
    }

    return left.merge(right).toProtobuf().build().toByteArray();
  }

  public static final RegressionMetrics fromProtobuf(byte[] bytes) {
    if (bytes == null || bytes.length == 0) {
      return null;
    }
    try {
      val sm = RegressionMetricsMessage.parseFrom(bytes);
      return com.whylogs.core.metrics.RegressionMetrics.fromProtobuf(sm);

    } catch (InvalidProtocolBufferException e) {
      return null;
    }
  }

  @Override
  public byte[] finish(byte[] reduction) {
    return reduction;
  }

  @Override
  public Encoder<byte[]> bufferEncoder() {
    return Encoders.BINARY();
  }

  @Override
  public Encoder<byte[]> outputEncoder() {
    return Encoders.BINARY();
  }
}
