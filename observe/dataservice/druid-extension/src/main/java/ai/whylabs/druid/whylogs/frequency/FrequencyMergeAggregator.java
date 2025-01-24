package ai.whylabs.druid.whylogs.frequency;

import javax.annotation.Nullable;
import org.apache.druid.query.aggregation.Aggregator;
import org.apache.druid.segment.ColumnValueSelector;

public class FrequencyMergeAggregator implements Aggregator {
  private final ColumnValueSelector selector;

  @Nullable private volatile StringItemSketch merged;

  public FrequencyMergeAggregator(final ColumnValueSelector selector) {
    this.selector = selector;
    merged = null;
  }

  @Override
  public synchronized void aggregate() {
    final Object object = selector.getObject();
    if (object == null) {
      return;
    }
    if (object instanceof StringItemSketch) {
      StringItemSketch col = (StringItemSketch) object;
      if (merged == null) {
        merged = col;
      } else {
        try {
          merged.get().merge(col.get());
        } catch (Exception e) {
        }
      }
    } else {
      throw new IllegalStateException("Unsupported object type: " + object.getClass().getName());
    }
  }

  @Override
  public synchronized Object get() {
    if (merged == null) {
      return FrequencyOperations.EMPTY_COLUMN;
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
