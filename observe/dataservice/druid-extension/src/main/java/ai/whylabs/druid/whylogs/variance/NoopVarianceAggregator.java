package ai.whylabs.druid.whylogs.variance;

import org.apache.druid.query.aggregation.Aggregator;

public class NoopVarianceAggregator implements Aggregator {
  @Override
  public Object get() {
    return VarianceOperations.EMPTY_TRACKER;
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
