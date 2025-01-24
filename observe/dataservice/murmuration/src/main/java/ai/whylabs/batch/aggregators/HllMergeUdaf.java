package ai.whylabs.batch.aggregators;

import com.shaded.whylabs.org.apache.datasketches.hll.HllSketch;
import com.shaded.whylabs.org.apache.datasketches.hll.Union;
import com.shaded.whylabs.org.apache.datasketches.memory.Memory;
import lombok.val;
import org.apache.spark.sql.Encoder;
import org.apache.spark.sql.Encoders;
import org.apache.spark.sql.expressions.Aggregator;

public class HllMergeUdaf extends Aggregator<byte[], byte[], byte[]> {
  public static final String UDAF_NAME = "mergeHLL";

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
    return mergeHll(a, b);
  }

  public static byte[] mergeHll(byte[] a, byte[] b) {
    val left = fromProtobuf(a);
    val right = fromProtobuf(b);

    if (left == null) {
      return b;
    } else if (right == null) {
      return a;
    }
    final Union union = new Union(12);
    union.update(left);
    union.update(right);
    return union.toCompactByteArray();
  }

  public static final HllSketch fromProtobuf(byte[] bytes) {
    if (bytes == null || bytes.length == 0) {
      return null;
    }
    return HllSketch.wrap(Memory.wrap(bytes));
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
