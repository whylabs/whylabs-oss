package ai.whylabs.dataservice.calculations;

import static ai.whylabs.dataservice.calculations.PostAggregators.KLL_METRIC_PATH;
import static com.whylogs.core.SummaryConverters.fromUpdateDoublesSketch;

import ai.whylabs.dataservice.responses.ColumnMetric;
import ai.whylabs.druid.whylogs.util.DruidStringUtils;
import com.shaded.whylabs.org.apache.datasketches.kll.KllDoublesSketch;
import com.whylogs.core.statistics.NumberTracker;
import com.whylogs.v0.core.message.HistogramSummary;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.Optional;
import lombok.Builder;
import lombok.SneakyThrows;
import lombok.val;

@Builder
public class KllPostAgg {
  public static final double[] DEFAULT_FRACTIONS =
      new double[] {0, 0.01, 0.05, 0.25, 0.5, 0.75, 0.95, 0.99, 1};
  public static final int DEFAULT_NUMBINS = 30;

  @Builder.Default Integer numBins = null;
  @Builder.Default double[] fractions = DEFAULT_FRACTIONS;
  @Builder.Default double[] splitPoints = null;

  public static KllDoublesSketch getSketch(Map<String, ColumnMetric> metrics) {
    val row = metrics.get(KLL_METRIC_PATH);
    if (row != null) {
      return deserialize(row.getStrings());
    }
    return null;
  }

  // Generate /histogram and /quantile metrics from kll datasketch.  The sketch is passed up from
  // postgres as a base64-encoded string.
  @SneakyThrows
  Map<String, ColumnMetric> calculate(Map<String, ColumnMetric> metrics) {
    val sketch = getSketch(metrics);
    if (sketch != null) {
      val summary = mkSummary(sketch);
      val hrow = new ColumnMetric(KLL_METRIC_PATH + "/histogram", summary);
      metrics.put(hrow.getMetricPath(), hrow);

      double[] quantiles;
      if (fractions != null && fractions.length > 0) {
        if (sketch.isEmpty()) {
          quantiles = new double[] {};
        } else {
          quantiles = sketch.getQuantiles(fractions);
        }
        val qrow = new ColumnMetric(KLL_METRIC_PATH + "/quantiles", quantiles);
        metrics.put(qrow.getMetricPath(), qrow);
      }
      metrics.remove(KLL_METRIC_PATH); // remove the sketch itself.
    }
    return metrics;
  }

  private HistogramSummary mkSummary(KllDoublesSketch sketch) {
    HistogramSummary summary;
    if (splitPoints != null) {
      summary = fromUpdateDoublesSketch(sketch, splitPoints);
    } else {
      summary =
          fromUpdateDoublesSketch(sketch, Optional.ofNullable(numBins).orElse(DEFAULT_NUMBINS));
    }
    return summary;
  }

  private static KllDoublesSketch deserialize(final String str) {
    return deserialize(DruidStringUtils.decodeBase64(str.getBytes(StandardCharsets.UTF_8)));
  }

  public static KllDoublesSketch deserialize(final byte[] data) {
    return NumberTracker.deserializeKllDoubles(data);
  }
}
