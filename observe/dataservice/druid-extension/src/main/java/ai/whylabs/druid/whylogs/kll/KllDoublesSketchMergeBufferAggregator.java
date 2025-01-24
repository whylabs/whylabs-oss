package ai.whylabs.druid.whylogs.kll;

import com.google.common.util.concurrent.Striped;
import com.shaded.whylabs.org.apache.datasketches.kll.KllDoublesSketch;
import com.shaded.whylabs.org.apache.datasketches.kll.KllFloatsSketch;
import com.shaded.whylabs.org.apache.datasketches.memory.Memory;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.util.concurrent.locks.Lock;
import java.util.concurrent.locks.ReadWriteLock;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import org.apache.druid.query.aggregation.AggregatorFactory;
import org.apache.druid.query.aggregation.BufferAggregator;
import org.apache.druid.query.monomorphicprocessing.RuntimeShapeInspector;
import org.apache.druid.segment.ColumnValueSelector;

@Slf4j
public class KllDoublesSketchMergeBufferAggregator implements BufferAggregator {

  /** for locking per buffer position (power of 2 to make index computation faster) */
  private static final int NUM_STRIPES = 64;

  private final ColumnValueSelector<KllDoublesSketch> selector;
  private final int size;

  // use of striped locking copied from HllSketchMergeBufferAggregator
  private final Striped<ReadWriteLock> stripedLock = Striped.readWriteLock(NUM_STRIPES);

  /**
   * Used by {@link #init(ByteBuffer, int)}. We initialize by copying a prebuilt empty
   * KllDoublesSketch image.
   */
  private final byte[] emptySketch;

  public KllDoublesSketchMergeBufferAggregator(
      final ColumnValueSelector selector, final int maxIntermediateSize) {
    this.selector = selector;
    this.size = maxIntermediateSize;
    this.emptySketch = KllDoublesSketchOperations.EMPTY_SKETCH.toByteArray();
  }

  /**
   * Initializes the buffer location
   *
   * <p>This method must not exceed the number of bytes returned by {@link
   * AggregatorFactory#getMaxIntermediateSizeWithNulls} in the corresponding {@link
   * AggregatorFactory}
   *
   * @param buf byte buffer to initialize
   * @param position offset within the byte buffer for initialization
   */
  @Override
  public synchronized void init(final ByteBuffer buf, final int position) {

    // Copy prebuilt empty sketch object.
    final int oldPosition = buf.position();
    try {
      buf.position(position);
      if (emptySketch.length > size) {
        throw new RuntimeException(
            String.format(
                "KllDoublesSketch init exceeded maximum size %d > %d", emptySketch.length, size));
      }
      buf.put(emptySketch);
    } finally {
      buf.position(oldPosition);
    }
  }

  /**
   * Merge KllDoublesSketch from selector.getObject() with sketch stored in shared memory buffer.
   * leaves merged result in shared memory buffer.
   *
   * <p>This method must not exceed the number of bytes returned by {@link
   * AggregatorFactory#getMaxIntermediateSizeWithNulls} in the corresponding {@link
   * AggregatorFactory}
   *
   * @param buf - shared memory where merged sketch is stored in encoded format.
   * @param position - offset in share memory where merged sketch begins
   */
  @Override
  @SneakyThrows
  public synchronized void aggregate(final ByteBuffer buf, final int position) {
    final KllDoublesSketch sketch = selector.getObject();
    if (sketch == null) {
      return;
    }
    final Memory mem = Memory.wrap(buf, ByteOrder.LITTLE_ENDIAN).region(position, size);
    final Lock lock = stripedLock.getAt(lockIndex(position)).writeLock();
    lock.lock();
    final int oldPosition = buf.position();
    try {
      // toByteArray/heapify are encode/decode routines for KllDoublesSketch.
      // Unlike other sketch types (e.g. HllSketch), KllDoublesSketch has no memory wrap routine
      // to directly access a piece of memory as if it were a sketch without first copying to the
      // heap.
      KllDoublesSketch union = heapifyKll(mem);
      try {
        if (!KllUtils.overflow(union, sketch)) {
          union.merge(sketch);
        }
      } catch (Exception e) {
        log.error("KllDoublesSketchMergeBufferAggregator.aggregate failed", e);
      }

      val encoded = union.toByteArray();
      if (encoded.length > size) {
        // be extra paranoid to perhaps catch buffer overfows.
        log.error(
            "KllDoublesSketch exceeded maximum size %d > %d, %s",
            encoded.length, size, union.toString());
      } else {
        buf.position(position);
        buf.put(encoded);
      }
    } finally {
      buf.position(oldPosition);
      lock.unlock();
    }
  }

  private static KllDoublesSketch heapifyKll(Memory mem) {
    try {
      return KllDoublesSketch.heapify(mem);
    } catch (Exception e) {
      val kllFloats = KllFloatsSketch.heapify(mem);
      return KllDoublesSketch.fromKllFloat(kllFloats);
    }
  }

  /**
   * This method uses locks because it can be used during indexing, and Druid can call aggregate()
   * and get() concurrently See https://github.com/druid-io/druid/pull/3956
   */
  @Override
  public synchronized Object get(final ByteBuffer buf, final int position) {
    final Memory mem = Memory.wrap(buf, ByteOrder.LITTLE_ENDIAN).region(position, size);
    final Lock lock = stripedLock.getAt(lockIndex(position)).readLock();
    lock.lock();
    try {
      return heapifyKll(mem);
    } finally {
      lock.unlock();
    }
  }

  @Override
  public float getFloat(final ByteBuffer buffer, final int position) {
    throw new UnsupportedOperationException("Not implemented");
  }

  @Override
  public long getLong(final ByteBuffer buffer, final int position) {
    throw new UnsupportedOperationException("Not implemented");
  }

  @Override
  public synchronized void close() {
    // nothing to close
  }

  @Override
  public void inspectRuntimeShape(final RuntimeShapeInspector inspector) {
    inspector.visit("selector", selector);
  }

  /** compute lock index to avoid boxing in Striped.get() call */
  static int lockIndex(final int position) {
    return smear(position) % NUM_STRIPES;
  }

  /**
   * see
   * https://github.com/google/guava/blob/master/guava/src/com/google/common/util/concurrent/Striped.java#L536-L548
   */
  private static int smear(int hashCode) {
    hashCode ^= (hashCode >>> 20) ^ (hashCode >>> 12);
    return hashCode ^ (hashCode >>> 7) ^ (hashCode >>> 4);
  }
}
