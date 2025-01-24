package ai.whylabs.ingestion;

import static java.util.Objects.isNull;

import com.whylogs.core.message.ColumnMessage;
import com.whylogs.core.message.FrequentItemsSketchMessage;
import com.whylogs.core.message.HllSketchMessage;
import com.whylogs.core.message.KllSketchMessage;
import com.whylogs.core.message.MetricComponentMessage;
import com.whylogs.v0.core.message.ColumnMessageV0;
import com.whylogs.v0.core.message.InferredType.Type;
import java.io.IOException;
import java.util.HashMap;
import java.util.Iterator;
import java.util.Map;
import java.util.Objects;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import org.apache.commons.lang3.tuple.Pair;
import org.apache.druid.java.util.common.parsers.CloseableIterator;

/*
 * Generates iterator of MetricComponents from all the columns in a V0 columnsMap. There is only one columnsMap per V0
 * profile, so this will effectively iterate through all the columns in a profile.
 *
 * Note: __internal__ columns that hold dateset-level metrics are iterated just like all other features.
 */
@Slf4j
public class V0toV1ColumnsIterator implements CloseableIterator<Pair<String, ColumnMessage>> {
  final Map<String, ColumnMessageV0> columnsMap;
  private final Iterator<Pair<String, ColumnMessage>> it;

  public V0toV1ColumnsIterator(Map<String, ColumnMessageV0> columnsMap) {
    this.columnsMap = columnsMap;
    it =
        columnsMap //
            .values() //
            .stream() //
            .map(V0toV1ColumnsIterator::asColumnMessage)
            .filter(Objects::nonNull)
            .iterator();
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

  //  Return a V1 ColumnMessage for all metrics in a v0 column.
  protected static Pair<String, ColumnMessage> asColumnMessage(ColumnMessageV0 col) {
    val m = new HashMap<String, MetricComponentMessage>();

    if (isNull(col)) {
      return null;
    }

    if (col.hasSchema()) {
      val schema = col.getSchema();
      val typeMap = schema.getTypeCountsMap();
      for (val e : typeMap.entrySet()) {
        switch (e.getKey()) {
          case Type.FRACTIONAL_VALUE:
            m.put(
                "types/fractional", MetricComponentMessage.newBuilder().setN(e.getValue()).build());
            break;
          case Type.INTEGRAL_VALUE:
            m.put("types/integral", MetricComponentMessage.newBuilder().setN(e.getValue()).build());
            break;
          case Type.STRING_VALUE:
            m.put("types/string", MetricComponentMessage.newBuilder().setN(e.getValue()).build());
            break;
          case Type.UNKNOWN_VALUE:
            m.put("types/object", MetricComponentMessage.newBuilder().setN(e.getValue()).build());
            break;
          case Type.BOOLEAN_VALUE:
            m.put("types/boolean", MetricComponentMessage.newBuilder().setN(e.getValue()).build());
            break;
          case Type.NULL_VALUE:
            m.put("counts/null", MetricComponentMessage.newBuilder().setN(e.getValue()).build());
            break;
          default:
            log.error("Unsupported counter type: {}", e.getKey());
        }
      }
    }

    if (col.hasCounters()) {
      m.put(
          "counts/n",
          MetricComponentMessage.newBuilder().setN(col.getCounters().getCount()).build());
    }

    if (col.hasNumbers()) {
      val numbers = col.getNumbers();

      m.put(
          "distribution/kll",
          MetricComponentMessage.newBuilder()
              .setKll(KllSketchMessage.newBuilder().setSketch(numbers.getHistogram()))
              .build());

      if (numbers.hasVariance()) {
        val variance = numbers.getVariance();
        if (variance.getCount() > 0) {
          // for compatability with druid, consider empty variance tracker to be missing entirely.
          m.put(
              "distribution/mean",
              MetricComponentMessage.newBuilder().setD(variance.getMean()).build());
          m.put(
              "distribution/m2",
              MetricComponentMessage.newBuilder().setD(variance.getSum()).build());
        }
      }
    }

    if (col.hasFrequentItems()) {
      m.put(
          "frequent_items/frequent_strings",
          MetricComponentMessage.newBuilder()
              .setFrequentItems(
                  FrequentItemsSketchMessage.newBuilder()
                      .setSketch(col.getFrequentItems().getSketch()))
              .build());
    }

    if (col.hasCardinalityTracker()) {
      m.put(
          "cardinality/hll",
          MetricComponentMessage.newBuilder()
              .setHll(
                  HllSketchMessage.newBuilder().setSketch(col.getCardinalityTracker().getSketch()))
              .build());
    }
    // package feature name with ColumnMessage so receiver knows which feature.
    val colMsg = ColumnMessage.newBuilder().putAllMetricComponents(m).build();
    return Pair.of(col.getName(), colMsg);
  }
}
