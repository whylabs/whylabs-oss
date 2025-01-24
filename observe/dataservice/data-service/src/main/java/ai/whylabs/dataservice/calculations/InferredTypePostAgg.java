package ai.whylabs.dataservice.calculations;

import static ai.whylabs.dataservice.calculations.PostAggregators.INFERRED_TYPE_METRIC_PATH;

import ai.whylabs.dataservice.responses.ColumnMetric;
import ai.whylabs.dataservice.responses.InferredTypeResult;
import com.whylogs.v0.core.message.InferredType.Type;
import java.util.HashMap;
import java.util.Map;
import java.util.Map.Entry;
import lombok.Builder;
import lombok.SneakyThrows;
import lombok.val;

@Builder
public class InferredTypePostAgg {
  private static final double CANDIDATE_MIN_FRAC = 0.7;

  @SneakyThrows
  public static Map<String, ColumnMetric> calculate(Map<String, ColumnMetric> metrics) {
    InferredTypeResult result = inferredType(metrics);
    val ratio = new ColumnMetric(INFERRED_TYPE_METRIC_PATH + "/ratio", result.getRatio());
    val type = new ColumnMetric(INFERRED_TYPE_METRIC_PATH + "/type", result.getType().name());
    metrics.put(ratio.getMetricPath(), ratio);
    metrics.put(type.getMetricPath(), type);
    return metrics;
  }

  public static InferredTypeResult inferredType(Map<String, ColumnMetric> metrics) {
    Map<Type, Long> typeCounts = new HashMap<>();
    typeCounts.put(Type.UNKNOWN, asLong(metrics, "types/object"));
    typeCounts.put(Type.FRACTIONAL, asLong(metrics, "types/fractional"));
    typeCounts.put(Type.INTEGRAL, asLong(metrics, "types/integral"));
    typeCounts.put(Type.BOOLEAN, asLong(metrics, "types/boolean"));
    typeCounts.put(Type.STRING, asLong(metrics, "types/string"));
    Long nulls = asLong(metrics, "counts/null");
    Long total = 0L;
    for (Entry<Type, Long> entry : typeCounts.entrySet()) {
      total += entry.getValue();
    }

    if (total == 0) return new InferredTypeResult(nulls > 0 ? Type.NULL : Type.UNKNOWN, 0.0);

    val candidate = getMostPopularCandidate(typeCounts, total);
    if (candidate.getRatio() > CANDIDATE_MIN_FRAC) {
      return candidate;
    }

    long integers = typeCounts.get(Type.INTEGRAL);
    long fractions = typeCounts.get(Type.FRACTIONAL);
    long strings = typeCounts.get(Type.STRING);
    long booleans = typeCounts.get(Type.BOOLEAN);

    // Integral is considered a subset of fractional here
    long fractionalCount = integers + fractions;
    if (candidate.getType().equals(Type.STRING) && strings > fractionalCount) {
      long coercedCount = integers + fractions + strings + booleans;
      double actualRatio = (double) coercedCount / total;
      return InferredTypeResult.builder().type(Type.STRING).ratio(actualRatio).build();
    }

    if (candidate.getRatio() >= .5) {
      // Not a string, but something else with a majority
      long actualCount = typeCounts.get(candidate.getType());
      if (candidate.getType().equals(Type.FRACTIONAL)) {
        actualCount = fractionalCount;
      }
      double ratio = (double) actualCount / total;
      return InferredTypeResult.builder().type(candidate.getType()).ratio(ratio).build();
    }

    double fractionalRatio = (double) fractionalCount / total;
    if (fractionalRatio >= .5) {
      return InferredTypeResult.builder().type(Type.FRACTIONAL).ratio(fractionalRatio).build();
    }

    // Otherwise, assume everything is the candidate type
    return InferredTypeResult.builder().type(candidate.getType()).ratio(1.0).build();
  }

  private static InferredTypeResult getMostPopularCandidate(
      Map<com.whylogs.v0.core.message.InferredType.Type, Long> typeCounts, long totalCount) {
    com.whylogs.v0.core.message.InferredType.Type itemType = Type.UNKNOWN;
    long count = 0L;
    long nullCount = 0L;
    for (Entry<Type, Long> entry : typeCounts.entrySet()) {
      if (entry.getKey().equals(Type.NULL)) {
        nullCount = entry.getValue();
        continue;
      }
      if (entry.getValue() > count) {
        itemType = entry.getKey();
        count = entry.getValue();
      }
    }
    if (count == 0 && nullCount > 0) {
      itemType = Type.NULL;
    }
    double ratio = (double) count / totalCount;
    return InferredTypeResult.builder().type(itemType).ratio(ratio).build();
  }

  private static Long asLong(Map<String, ColumnMetric> metrics, String path) {
    val s = metrics.get(path);
    return (s != null) ? s.getLongs() : 0L;
  }
}
