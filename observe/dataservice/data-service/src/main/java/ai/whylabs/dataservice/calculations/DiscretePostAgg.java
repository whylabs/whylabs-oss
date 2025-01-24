package ai.whylabs.dataservice.calculations;

import static ai.whylabs.dataservice.calculations.PostAggregators.ISDISCRETE_METRIC_PATH;
import static com.whylogs.v0.core.message.InferredType.Type.FRACTIONAL;
import static com.whylogs.v0.core.message.InferredType.Type.STRING;
import static com.whylogs.v0.core.message.InferredType.Type.UNKNOWN;

import ai.whylabs.dataservice.responses.ColumnMetric;
import com.whylogs.v0.core.message.InferredType.Type;
import java.util.Map;
import java.util.Optional;
import lombok.Builder;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import lombok.val;

@Slf4j
@Builder
public class DiscretePostAgg {
  private static final float CARDINALITY_SLOPE = 1f;
  private static final float P = 0.15f;

  @SneakyThrows
  Map<String, ColumnMetric> calculate(Map<String, ColumnMetric> metrics) {
    val isDiscrete = isDiscrete(metrics);
    if (isDiscrete != null) {
      val newrow = new ColumnMetric(ISDISCRETE_METRIC_PATH, isDiscrete);
      metrics.put(newrow.getMetricPath(), newrow);
    }
    return metrics;
  }

  @SneakyThrows
  public static Type getInferredType(Map<String, ColumnMetric> metrics) {
    val type = InferredTypePostAgg.inferredType(metrics);
    return type.getType();
  }

  @SneakyThrows
  public static Boolean isDiscrete(Map<String, ColumnMetric> metrics) {
    val numR =
        Optional.ofNullable(metrics.get("counts/n")).map(ColumnMetric::getLongs).orElse(null);
    val card =
        Optional.ofNullable(metrics.get("cardinality/est"))
            .map(ColumnMetric::getDoubles)
            .orElse(null);
    // cannot compute isDiscrete if underlying metrics are not available.
    if (card == null || numR == null) return null;

    // Always return non-discrete for fractional value
    Type type = getInferredType(metrics);
    if (type != null && type.equals(FRACTIONAL)) {
      return false;
    }
    // Strings and unknowns are always discrete
    if (type != null && (type.equals(STRING) || type.equals(UNKNOWN))) {
      return true;
    }

    if (card >= numR) {
      return false;
    }

    if (numR < 1L) {
      return false;
    }

    if (card < 1.0) {
      // usually Cardinality expected to be >= 1 for num records >= 1,
      // unless HLLSketch is empty
      // TODO - does not match python calculation.  Should raise ValueError this case.
      log.trace("Unexpected cardinality value: {}", card);
      return true;
    }

    boolean discrete = false;
    double density = numR / (card + CARDINALITY_SLOPE);
    if (1 / density <= P) {
      discrete = true;
    }
    return discrete;
  }
}
