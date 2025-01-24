package ai.whylabs.druid.whylogs.frequency;

import java.nio.ByteBuffer;
import org.apache.druid.query.aggregation.BufferAggregator;
import org.apache.druid.query.monomorphicprocessing.RuntimeShapeInspector;

public class NoopFrequencyBufferAggregator implements BufferAggregator {

  @Override
  public void init(final ByteBuffer buf, final int position) {}

  @Override
  public void aggregate(final ByteBuffer buf, final int position) {}

  @Override
  public Object get(final ByteBuffer buf, final int position) {
    return FrequencyOperations.EMPTY_COLUMN;
  }

  @Override
  public float getFloat(final ByteBuffer buf, final int position) {
    throw new UnsupportedOperationException("Not implemented");
  }

  @Override
  public long getLong(final ByteBuffer buf, final int position) {
    throw new UnsupportedOperationException("Not implemented");
  }

  @Override
  public void close() {}

  @Override
  public void inspectRuntimeShape(final RuntimeShapeInspector inspector) {}
}
