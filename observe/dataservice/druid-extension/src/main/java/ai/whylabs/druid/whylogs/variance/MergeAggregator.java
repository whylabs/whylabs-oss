package ai.whylabs.druid.whylogs.variance;

import com.whylogs.core.statistics.datatypes.VarianceTracker;
import javax.annotation.Nullable;
import org.apache.druid.query.aggregation.Aggregator;
import org.apache.druid.segment.ColumnValueSelector;

public class MergeAggregator implements Aggregator {

  private final ColumnValueSelector selector;

  @Nullable private volatile VarianceTracker merged;

  public MergeAggregator(final ColumnValueSelector selector) {
    this.selector = selector;
    merged = null;
  }

  @Override
  public synchronized void aggregate() {
    final Object object = selector.getObject();
    if (object == null) {
      return;
    }
    if (object instanceof VarianceTracker) {
      VarianceTracker m1 = (VarianceTracker) object;
      if (merged == null) {
        merged = m1;
      } else {
        merged = merged.merge(m1);
      }
    } else {
      throw new IllegalStateException("Unsupported object type: " + object.getClass().getName());
    }
  }

  @Override
  public synchronized Object get() {
    if (merged == null) {
      return VarianceOperations.EMPTY_TRACKER;
    } else {
      return merged;
    }
  }

  @Override
  public float getFloat() {
    throw new UnsupportedOperationException("Not implemented");
  }

  @Override
  public long getLong() {
    throw new UnsupportedOperationException("Not implemented");
  }

  @Override
  public synchronized void close() {
    merged = null;
  }
}
