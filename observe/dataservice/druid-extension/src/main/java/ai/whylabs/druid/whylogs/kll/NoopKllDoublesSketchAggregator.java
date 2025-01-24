package ai.whylabs.druid.whylogs.kll;

import org.apache.druid.query.aggregation.Aggregator;

public class NoopKllDoublesSketchAggregator implements Aggregator {
  @Override
  public Object get() {
    return KllDoublesSketchOperations.EMPTY_SKETCH;
  }

  @Override
  public void aggregate() {}

  @Override
  public void close() {}

  @Override
  public float getFloat() {
    throw new UnsupportedOperationException("Not implemented");
  }

  @Override
  public long getLong() {
    throw new UnsupportedOperationException("Not implemented");
  }
}
