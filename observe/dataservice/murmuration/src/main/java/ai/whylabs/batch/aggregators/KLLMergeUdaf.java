package ai.whylabs.batch.aggregators;

import com.shaded.whylabs.org.apache.datasketches.kll.KllDoublesSketch;
import com.shaded.whylabs.org.apache.datasketches.kll.KllFloatsSketch;
import com.shaded.whylabs.org.apache.datasketches.memory.Memory;
import lombok.val;
import org.apache.spark.sql.Encoder;
import org.apache.spark.sql.Encoders;
import org.apache.spark.sql.expressions.Aggregator;

public class KLLMergeUdaf extends Aggregator<byte[], byte[], byte[]> {
  public static final String UDAF_NAME = "mergeKLL";

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
    return mergeKLL(a, b);
  }

  public static byte[] mergeKLL(byte[] a, byte[] b) {
    val left = fromProtobuf(a);
    val right = fromProtobuf(b);

    if (left == null) {
      return b;
    } else if (right == null) {
      return a;
    }
    left.merge(right);
    return left.toByteArray();
  }

  public static final KllDoublesSketch fromProtobuf(byte[] bytes) {
    if (bytes == null || bytes.length == 0) {
      return null;
    }
    Memory hMem = Memory.wrap(bytes);
    KllDoublesSketch sketch;
    try {
      sketch = KllDoublesSketch.heapify(hMem);
    } catch (Exception var4) {
      KllFloatsSketch kllFloats = KllFloatsSketch.heapify(hMem);
      sketch = KllDoublesSketch.fromKllFloat(kllFloats);
    }
    return sketch;
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
