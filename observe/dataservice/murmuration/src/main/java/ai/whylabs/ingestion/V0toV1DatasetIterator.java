package ai.whylabs.ingestion;

import com.google.common.collect.Iterators;
import com.shaded.whylabs.com.google.protobuf.Any;
import com.whylogs.core.message.ColumnMessage;
import com.whylogs.core.message.MetricComponentMessage;
import com.whylogs.v0.core.message.ModelMetricsMessage;
import com.whylogs.v0.core.message.ModelType;
import java.io.IOException;
import java.util.Collections;
import java.util.HashMap;
import java.util.Iterator;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import org.apache.commons.lang3.tuple.Pair;
import org.apache.druid.java.util.common.parsers.CloseableIterator;

/*
 * Generates iterator of MetricComponents from V0 dataset performance metrics.
 */
@Slf4j
public class V0toV1DatasetIterator implements CloseableIterator<Pair<String, ColumnMessage>> {
  public static final int MAX_LABELS = 20; // max labels in classification model.

  private Iterator<Pair<String, ColumnMessage>> it = Collections.emptyIterator();

  /**
   * Manage state of interator generating V1 metrics from V0 performance metrics.
   *
   * <p>The sole purpose of `v1meta` is to provide logging context when we encounter an error.
   */
  public V0toV1DatasetIterator(V1Metadata v1meta, ModelMetricsMessage mmMsg) {

    // we are only interested in ingesting regression and classification model metrics
    ModelType modelType = mmMsg.getModelType();

    val m = new HashMap<String, MetricComponentMessage>();
    switch (modelType) {
      case CLASSIFICATION:
        // Restrict CLASSIFICATION metric size - too many labels cause performance problems.
        if (mmMsg.getScoreMatrix().getLabelsCount() > MAX_LABELS) {
          log.error(
              "Skipping ingestion of large classification metrics from {}/{} ts:{} : #labels={}",
              v1meta.getOrgId(),
              v1meta.getDatasetId(),
              v1meta.getDatasetTimestamp(),
              mmMsg.getScoreMatrix().getLabelsCount());
          break;
        }
        m.put(
            "model/classification",
            MetricComponentMessage.newBuilder().setMsg(Any.pack(mmMsg.getScoreMatrix())).build());
        break;
      case REGRESSION:
        m.put(
            "model/regression",
            MetricComponentMessage.newBuilder()
                .setMsg(Any.pack(mmMsg.getRegressionMetrics()))
                .build());
        break;
    }

    if (m.size() > 0) {
      val colMsg = ColumnMessage.newBuilder().putAllMetricComponents(m).build();
      it = Iterators.forArray(Pair.of(null, colMsg));
    }
  }

  @Override
  public void close() throws IOException {}

  @SneakyThrows
  @Override
  public boolean hasNext() {
    return it.hasNext();
  }

  @Override
  public Pair<String, ColumnMessage> next() {
    return it.next();
  }
}
