package ai.whylabs.druid.whylogs.modelmetrics;

import com.google.common.util.concurrent.Striped;
import it.unimi.dsi.fastutil.ints.Int2ObjectMap;
import it.unimi.dsi.fastutil.ints.Int2ObjectOpenHashMap;
import java.nio.ByteBuffer;
import java.util.IdentityHashMap;
import java.util.concurrent.locks.Lock;
import java.util.concurrent.locks.ReadWriteLock;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import org.apache.druid.query.aggregation.BufferAggregator;
import org.apache.druid.segment.ColumnValueSelector;

@Slf4j
public class MergeBufferAggregator implements BufferAggregator {

  /** for locking per buffer position (power of 2 to make index computation faster) */
  private static final int NUM_STRIPES = 64;

  /**
   * Implementation note: This aggregator writes protobuf encoded objects to buffers, but at no time
   * does it read messages from those buffers. Instead, binary objects are cached in this map
   * indexed by buffer and position. When presented with a buffer and position, this aggregator
   * looks up the object in this map. After updates, the map and but buffer are both updated.
   *
   * <p>Protobuf message decoding from ByteBuffer requires that the buffer be the exact length of
   * the message. That is not possible here as the buffers are all fixed size but contain encoded
   * messages with a variety of lengths. Second it is not possible to encode a null object in the
   * buffer; that would just be an empty buffer which protobuf doesn't know how to deal with.
   *
   * <p>Datasketches (HllSketch, KllFloatsSketch) on the other hand can be directly encoded in byte
   * buffers.
   */
  private final IdentityHashMap<ByteBuffer, Int2ObjectMap<DruidModelMetrics>> unions =
      new IdentityHashMap<>();

  private final ColumnValueSelector<DruidModelMetrics> selector;
  private final int size;

  // use of striped locking copied from HllSketchMergeBufferAggregator
  private final Striped<ReadWriteLock> stripedLock = Striped.readWriteLock(NUM_STRIPES);

  public MergeBufferAggregator(final ColumnValueSelector selector, final int maxIntermediateSize) {
    this.selector = selector;
    this.size = maxIntermediateSize;
  }

  @Override
  public synchronized void init(final ByteBuffer buffer, final int position) {
    putUnion(buffer, position, null);
  }

  @Override
  public synchronized void aggregate(final ByteBuffer buf, final int position) {
    DruidModelMetrics union = unions.get(buf).get(position);
    final Object object = selector.getObject();
    if (object == null) {
      return;
    }
    final Lock lock = stripedLock.getAt(lockIndex(position)).writeLock();
    lock.lock();
    final int oldPosition = buf.position();

    try {
      if (object instanceof DruidModelMetrics) {
        DruidModelMetrics col = (DruidModelMetrics) object;
        if (union == null) {
          union = col;
        } else {
          try {
            union = union.merge(col);
          } catch (Exception e) {
            log.error("MergeBufferAggregator.aggregate failed to merge object.", e);
          }
        }
        putUnion(buf, position, union);
      } else {
        throw new IllegalStateException("Unsupported object type: " + object.getClass().getName());
      }
      val encoded = union.toProtobuf().build().toByteArray();
      if (encoded.length > size) {
        // be extra paranoid to perhaps catch buffer overfows.
        log.error(
            "DruidModelMetrics exceeded maximum size {} > {}, {}",
            encoded.length,
            size,
            union.toString());
      } else {
        buf.position(position);
        buf.put(encoded);
      }

    } finally {
      buf.position(oldPosition);
      lock.unlock();
    }
  }

  @Override
  public synchronized Object get(final ByteBuffer buffer, final int position) {
    final Lock lock = stripedLock.getAt(lockIndex(position)).readLock();
    lock.lock();
    try {
      return unions.get(buffer).get(position);
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
    unions.clear();
  }

  // A small number of sketches may run out of the given memory, request more memory on heap and
  // move there.
  // In that case we need to reuse the object from the cache as opposed to wrapping the new
  // buffer.
  @Override
  public synchronized void relocate(
      int oldPosition, int newPosition, ByteBuffer oldBuffer, ByteBuffer newBuffer) {
    Int2ObjectMap<DruidModelMetrics> oldIntMap = unions.get(oldBuffer);
    DruidModelMetrics union = oldIntMap.get(oldPosition);
    putUnion(newBuffer, newPosition, union);

    oldIntMap.remove(oldPosition);
    if (oldIntMap.isEmpty()) {
      unions.remove(oldBuffer);
    }
  }

  private void putUnion(
      final ByteBuffer buffer, final int position, final DruidModelMetrics union) {
    Int2ObjectMap<DruidModelMetrics> map =
        unions.computeIfAbsent(buffer, buf -> new Int2ObjectOpenHashMap<>());
    map.put(position, union);
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
