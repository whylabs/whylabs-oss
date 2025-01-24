package ai.whylabs.core.aggregation;

import ai.whylabs.core.structures.ExplodedRow;
import ai.whylabs.druid.whylogs.schematracker.InferredTypePostAggregatorResultStructure;
import com.shaded.whylabs.org.apache.datasketches.hll.HllSketch;
import com.whylogs.v0.core.message.InferredType;
import java.util.HashMap;
import java.util.Map;
import javax.annotation.Nullable;
import lombok.extern.slf4j.Slf4j;
import lombok.val;

@Slf4j
public class ResultPostAggregatorNoDruid {

  private static double CANDIDATE_MIN_FRAC = 0.7;
  private static final float CARDINALITY_SLOPE = 1f;
  private static final float P = 0.15f;

  @Nullable
  public static Boolean compute(@Nullable HllSketch hll, Long numR, InferredType.Type type) {
    // Always return non-discrete for fractional value
    if (type != null && type.getNumber() == InferredType.Type.FRACTIONAL.getNumber()) {
      return false;
    }
    // Strings and unknowns are always discrete
    if (type != null
        && (type.getNumber() == InferredType.Type.STRING.getNumber()
            || type.getNumber() == InferredType.Type.UNKNOWN.getNumber())) {
      return true;
    }
    if (hll == null) {
      return null;
    }

    double card = hll.getEstimate();

    if (numR == null || card >= numR) {
      return false;
    }

    if (numR < 1L) {
      return false;
    }

    if (card < 1.0) {
      // usually Cardinality expected to be >= 1 for num records >= 1,
      // unless HLLSketch is empty
      // TODO - does not match python calculation.  Should raise ValueError this case.
      log.trace("Unexpected cardinality value: %s", card);

      return true;
    }

    boolean discrete = false;
    double density = numR / (card + CARDINALITY_SLOPE);
    if (1 / density <= P) {
      discrete = true;
    }
    return discrete;
  }

  public static InferredTypePostAggregatorResultStructure computeInferredType(ExplodedRow row) {
    Map<InferredType.Type, Long> typeCounts = new HashMap<>();
    typeCounts.put(InferredType.Type.UNKNOWN, row.getSchema_count_UNKNOWN());
    typeCounts.put(InferredType.Type.FRACTIONAL, row.getSchema_count_FRACTIONAL());
    typeCounts.put(InferredType.Type.INTEGRAL, row.getSchema_count_INTEGRAL());
    typeCounts.put(InferredType.Type.BOOLEAN, row.getSchema_count_BOOLEAN());
    typeCounts.put(InferredType.Type.STRING, row.getSchema_count_STRING());

    Long total = 0L;
    for (Map.Entry<InferredType.Type, Long> entry : typeCounts.entrySet()) {
      total += entry.getValue();
    }

    if (total == 0) {
      if (row.getSchema_count_NULL() > 0) {
        return InferredTypePostAggregatorResultStructure.builder()
            .ratio(0.0)
            .type(InferredType.Type.NULL)
            .build();
      } else {
        return InferredTypePostAggregatorResultStructure.builder()
            .ratio(0.0)
            .type(InferredType.Type.UNKNOWN)
            .build();
      }
    }

    val candidate = getMostPopularCandidate(typeCounts, total);
    if (candidate.getRatio() > CANDIDATE_MIN_FRAC) {
      return candidate;
    }

    long integers = 0l;
    long fractions = 0l;
    long strings = 0l;
    long booleans = 0l;
    if (typeCounts.get(InferredType.Type.INTEGRAL) != null) {
      integers = typeCounts.get(InferredType.Type.INTEGRAL);
    }
    if (typeCounts.get(InferredType.Type.FRACTIONAL) != null) {
      fractions = typeCounts.get(InferredType.Type.FRACTIONAL);
    }
    if (typeCounts.get(InferredType.Type.STRING) != null) {
      strings = typeCounts.get(InferredType.Type.STRING);
    }
    if (typeCounts.get(InferredType.Type.BOOLEAN) != null) {
      booleans = typeCounts.get(InferredType.Type.BOOLEAN);
    }

    // Integral is considered a subset of fractional here
    long fractionalCount = integers + fractions;
    if (candidate.getType().equals(InferredType.Type.STRING) && strings > fractionalCount) {
      long coercedCount = integers + fractions + strings + booleans;
      double actualRatio = (double) coercedCount / total;
      return InferredTypePostAggregatorResultStructure.builder()
          .type(InferredType.Type.STRING)
          .ratio(actualRatio)
          .build();
    }

    if (candidate.getRatio() >= .5) {
      // Not a string, but something else with a majority
      long actualCount = typeCounts.get(candidate.getType());
      if (candidate.getType().equals(InferredType.Type.FRACTIONAL)) {
        actualCount = fractionalCount;
      }
      double ratio = (double) actualCount / total;
      return InferredTypePostAggregatorResultStructure.builder()
          .type(candidate.getType())
          .ratio(ratio)
          .build();
    }

    double fractionalRatio = (double) fractionalCount / total;
    if (fractionalRatio >= .5) {
      return InferredTypePostAggregatorResultStructure.builder()
          .type(InferredType.Type.FRACTIONAL)
          .ratio(fractionalRatio)
          .build();
    }

    // Otherwise, assume everything is the candidate type
    return InferredTypePostAggregatorResultStructure.builder()
        .type(candidate.getType())
        .ratio(1.0)
        .build();
  }

  private static InferredTypePostAggregatorResultStructure getMostPopularCandidate(
      Map<InferredType.Type, Long> typeCounts, long totalCount) {
    InferredType.Type itemType = InferredType.Type.UNKNOWN;
    long count = 0L;
    long nullCount = 0L;
    for (Map.Entry<InferredType.Type, Long> entry : typeCounts.entrySet()) {
      if (entry.getKey().equals(InferredType.Type.NULL)) {
        nullCount = entry.getValue();
        continue;
      }
      if (entry.getValue() > count) {
        itemType = entry.getKey();
        count = entry.getValue();
      }
    }
    if (count == 0 && nullCount > 0) {
      itemType = InferredType.Type.NULL;
    }
    double ratio = (double) count / totalCount;
    return InferredTypePostAggregatorResultStructure.builder().type(itemType).ratio(ratio).build();
  }
}
