package ai.whylabs.batch.aggregators;

import ai.whylabs.druid.whylogs.frequency.FrequencyOperations;
import ai.whylabs.druid.whylogs.frequency.StringItemSketch;
import com.shaded.whylabs.org.apache.datasketches.SketchesArgumentException;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import org.apache.spark.sql.Encoder;
import org.apache.spark.sql.Encoders;
import org.apache.spark.sql.expressions.Aggregator;

@Slf4j
public class FrequentStringItemsMergeUdaf extends Aggregator<byte[], byte[], byte[]> {
  public static final String UDAF_NAME = "frequentStringMerge";

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
    return mergeFreq(a, b);
  }

  public static byte[] mergeFreq(byte[] a, byte[] b) {
    val left = fromProtobuf(a);
    val right = fromProtobuf(b);

    if (left == null) {
      return b;
    } else if (right == null) {
      return a;
    }

    val merged = left.get().merge(right.get());
    return FrequencyOperations.serialize(merged);
  }

  public static final StringItemSketch fromProtobuf(byte[] bytes) {
    if (bytes == null || bytes.length <= 8) {
      return null;
    }
    try {
      return FrequencyOperations.deserializeFromByteArray(bytes);
    } catch (SketchesArgumentException e) {
      log.error("Unable to parse freq item sketch ", e);
    }
    return null;
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
