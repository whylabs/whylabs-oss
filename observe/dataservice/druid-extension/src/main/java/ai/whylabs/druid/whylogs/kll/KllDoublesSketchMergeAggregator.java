package ai.whylabs.druid.whylogs.kll;

import com.shaded.whylabs.org.apache.datasketches.kll.KllDoublesSketch;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import org.apache.druid.query.aggregation.Aggregator;
import org.apache.druid.segment.ColumnValueSelector;

@Slf4j
public class KllDoublesSketchMergeAggregator implements Aggregator {
  private final ColumnValueSelector<KllDoublesSketch> selector;
  private volatile KllDoublesSketch merged;

  public KllDoublesSketchMergeAggregator(
      final ColumnValueSelector<KllDoublesSketch> selector, final int k) {
    this.selector = selector;
    merged = new KllDoublesSketch(k);
  }

  @Override
  @SneakyThrows
  public synchronized void aggregate() {
    final KllDoublesSketch sketch = selector.getObject();
    if (sketch == null) {
      return;
    }
    synchronized (this) {
      if (!KllUtils.overflow(merged, sketch)) {
        try {
          merged.merge(sketch);
        } catch (Exception e) {
          log.error("KllDoublesSketchMergeAggregator.aggregate failed", e);
        }
      }
    }
  }

  @Override
  public synchronized Object get() {
    return merged;
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
