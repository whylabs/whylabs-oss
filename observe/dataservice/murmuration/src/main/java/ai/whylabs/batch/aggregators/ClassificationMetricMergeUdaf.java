package ai.whylabs.batch.aggregators;

import com.shaded.whylabs.com.google.protobuf.InvalidProtocolBufferException;
import com.whylogs.core.metrics.ClassificationMetrics;
import com.whylogs.v0.core.message.ScoreMatrixMessage;
import lombok.val;
import org.apache.spark.sql.Encoder;
import org.apache.spark.sql.Encoders;
import org.apache.spark.sql.expressions.Aggregator;

public class ClassificationMetricMergeUdaf extends Aggregator<byte[], byte[], byte[]> {
  public static final String UDAF_NAME = "mergeClassificationMetrics";

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
    return mergeClassification(a, b);
  }

  public static byte[] mergeClassification(byte[] a, byte[] b) {
    val left = fromProtobuf(a);
    val right = fromProtobuf(b);

    if (left == null) {
      return b;
    } else if (right == null) {
      return a;
    }

    return left.merge(right).toProtobuf().build().toByteArray();
  }

  public static final ClassificationMetrics fromProtobuf(byte[] b) {
    if (b == null) {
      return null;
    }
    try {

      val sm = ScoreMatrixMessage.parseFrom(b);
      return com.whylogs.core.metrics.ClassificationMetrics.fromProtobuf(sm);

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
