package ai.whylabs.druid.whylogs.modelmetrics;

import javax.annotation.Nullable;
import lombok.extern.slf4j.Slf4j;
import org.apache.druid.query.aggregation.Aggregator;
import org.apache.druid.segment.ColumnValueSelector;

@Slf4j
public class MergeAggregator implements Aggregator {

  private final ColumnValueSelector selector;

  @Nullable private volatile DruidModelMetrics merged;

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
    if (object instanceof DruidModelMetrics) {
      DruidModelMetrics m1 = (DruidModelMetrics) object;
      if (merged == null) {
        merged = m1;
      } else {
        try {
          merged = merged.merge(m1);
        } catch (Exception e) {
          log.error("MergeAggregator.aggregate failed to merge object", e);
        }
      }
    } else {
      log.error("Unsupported object type: {} ", object.getClass().getName());
    }
  }

  @Override
  public synchronized Object get() {
    if (merged == null) {
      return Operations.EMPTY_COLUMN;
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
