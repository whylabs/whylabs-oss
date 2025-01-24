package ai.whylabs.druid.whylogs.frequency;

import org.apache.druid.query.aggregation.Aggregator;

public class NoopFrequencyAggregator implements Aggregator {

  @Override
  public Object get() {
    return FrequencyOperations.EMPTY_COLUMN;
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
