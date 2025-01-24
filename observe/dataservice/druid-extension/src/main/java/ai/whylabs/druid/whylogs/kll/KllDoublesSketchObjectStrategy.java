package ai.whylabs.druid.whylogs.kll;

import com.shaded.whylabs.org.apache.datasketches.kll.KllDoublesSketch;
import com.whylogs.core.statistics.NumberTracker;
import java.nio.ByteBuffer;
import org.apache.druid.segment.data.ObjectStrategy;

public class KllDoublesSketchObjectStrategy implements ObjectStrategy<KllDoublesSketch> {

  @Override
  public int compare(final KllDoublesSketch s1, final KllDoublesSketch s2) {
    return KllDoublesSketchAggregatorFactory.COMPARATOR.compare(s1, s2);
  }

  @Override
  public KllDoublesSketch fromByteBuffer(final ByteBuffer buffer, final int numBytes) {
    if (numBytes == 0) {
      return KllDoublesSketchOperations.EMPTY_SKETCH;
    }
    final byte[] bytes = new byte[numBytes];
    buffer.get(bytes, 0, numBytes);
    return NumberTracker.deserializeKllDoubles(bytes);
  }

  @Override
  public Class<KllDoublesSketch> getClazz() {
    return KllDoublesSketch.class;
  }

  @Override
  public byte[] toBytes(final KllDoublesSketch sketch) {
    if (sketch == null || sketch.isEmpty()) {
      return KllDoublesSketchOperations.EMPTY_SKETCH.toByteArray();
    }
    return sketch.toByteArray();
  }
}
