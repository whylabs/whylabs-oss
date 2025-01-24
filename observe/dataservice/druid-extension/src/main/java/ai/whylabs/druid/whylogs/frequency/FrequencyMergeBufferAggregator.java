package ai.whylabs.druid.whylogs.frequency;

import com.shaded.whylabs.org.apache.datasketches.memory.WritableMemory;
import it.unimi.dsi.fastutil.ints.Int2ObjectMap;
import it.unimi.dsi.fastutil.ints.Int2ObjectOpenHashMap;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.util.IdentityHashMap;
import lombok.extern.slf4j.Slf4j;
import org.apache.druid.query.aggregation.BufferAggregator;
import org.apache.druid.query.monomorphicprocessing.RuntimeShapeInspector;
import org.apache.druid.segment.ColumnValueSelector;

@Slf4j
public class FrequencyMergeBufferAggregator implements BufferAggregator {
  private final ColumnValueSelector selector;
  private final int maxIntermediateSize;
  private final IdentityHashMap<ByteBuffer, WritableMemory> memCache = new IdentityHashMap<>();

  private final IdentityHashMap<ByteBuffer, Int2ObjectMap<StringItemSketch>> unions =
      new IdentityHashMap<>();

  public FrequencyMergeBufferAggregator(
      final ColumnValueSelector selector, final int maxIntermediateSize) {
    this.selector = selector;
    this.maxIntermediateSize = maxIntermediateSize;
  }

  @Override
  public synchronized void init(final ByteBuffer buf, final int position) {
    // Copy prebuilt empty sketch object.
    final StringItemSketch emptySketch = new StringItemSketch();
    putSketch(buf, position, emptySketch);
  }

  private WritableMemory getMemory(final ByteBuffer buffer) {
    return memCache.computeIfAbsent(
        buffer, buf -> WritableMemory.writableWrap(buf, ByteOrder.LITTLE_ENDIAN));
  }

  @Override
  public synchronized void aggregate(final ByteBuffer buf, final int position) {
    StringItemSketch sketch = unions.get(buf).get(position);
    final Object object = selector.getObject();
    if (object == null) {
      return;
    }

    if (object instanceof StringItemSketch) {
      StringItemSketch col = (StringItemSketch) object;
      if (sketch == null) {
        sketch = col;
      } else {
        try {
          sketch.get().merge(col.get());
        } catch (Exception e) {
          log.error("FrequencyMergeBufferAggregator.aggregate failed", e);
        }
      }
      putSketch(buf, position, sketch);
    } else {
      throw new IllegalStateException("Unsupported object type: " + object.getClass().getName());
    }
  }

  @Override
  public synchronized Object get(final ByteBuffer buffer, final int position) {
    return unions.get(buffer).get(position);
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
    StringItemSketch sketch = unions.get(oldBuffer).get(oldPosition);
    putSketch(newBuffer, newPosition, sketch);

    Int2ObjectMap<StringItemSketch> map = unions.get(oldBuffer);
    map.remove(oldPosition);
    if (map.isEmpty()) {
      unions.remove(oldBuffer);
    }
  }

  private void putSketch(
      final ByteBuffer buffer, final int position, final StringItemSketch sketch) {
    Int2ObjectMap<StringItemSketch> map =
        unions.computeIfAbsent(buffer, buf -> new Int2ObjectOpenHashMap<>());
    if (sketch != null) {
      final int oldPosition = buffer.position();
      try {
        buffer.position(position);
        buffer.put(FrequencyOperations.serialize(sketch));
      } finally {
        buffer.position(oldPosition);
      }
      map.put(position, sketch);
    }
  }

  @Override
  public void inspectRuntimeShape(final RuntimeShapeInspector inspector) {
    inspector.visit("selector", selector);
  }
}
