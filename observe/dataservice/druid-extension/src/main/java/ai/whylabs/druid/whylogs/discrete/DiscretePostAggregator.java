package ai.whylabs.druid.whylogs.discrete;

import ai.whylabs.druid.whylogs.CacheIdConstants;
import ai.whylabs.druid.whylogs.schematracker.InferredTypePostAggregator;
import ai.whylabs.druid.whylogs.schematracker.InferredTypePostAggregatorResultStructure;
import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.google.common.base.Preconditions;
import com.google.common.collect.Sets;
import com.shaded.whylabs.org.apache.datasketches.hll.HllSketch;
import com.shaded.whylabs.org.apache.datasketches.memory.Memory;
import com.whylogs.v0.core.message.InferredType;
import com.whylogs.v0.core.message.InferredType.Type;
import java.util.Comparator;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import javax.annotation.Nullable;
import lombok.NonNull;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import org.apache.druid.java.util.common.IAE;
import org.apache.druid.query.aggregation.AggregatorFactory;
import org.apache.druid.query.aggregation.PostAggregator;
import org.apache.druid.query.cache.CacheKeyBuilder;
import org.apache.druid.segment.column.ValueType;

@Slf4j
public class DiscretePostAggregator implements PostAggregator {
  private static final float P = 0.15f;
  private static final float CARDINALITY_SLOPE = 1f;

  private PostAggregator numRecords;
  private PostAggregator cardinality;
  private InferredTypePostAggregator inferredType;
  private String name;
  private Set<String> dependentFields;

  @JsonCreator
  public DiscretePostAggregator(
      @JsonProperty("name") final String name,
      @JsonProperty("numRecords") final PostAggregator numRecords,
      @JsonProperty("cardinality") final PostAggregator cardinality,
      @JsonProperty("inferredType") final InferredTypePostAggregator inferredType) {

    this.name = Preconditions.checkNotNull(name, "Name must not be null");
    this.numRecords = Preconditions.checkNotNull(numRecords, "numRecords is null");
    this.cardinality = Preconditions.checkNotNull(cardinality, "cardinality is null");
    this.inferredType = inferredType;
  }

  @NonNull
  @Override
  public Set<String> getDependentFields() {
    if (dependentFields == null) {
      dependentFields = Sets.newHashSet();
      dependentFields.addAll(numRecords.getDependentFields());
      dependentFields.addAll(cardinality.getDependentFields());
      if (inferredType != null) {
        dependentFields.addAll(inferredType.getDependentFields());
      }
    }
    return dependentFields;
  }

  @Override
  public Comparator getComparator() {
    throw new IAE("Comparing discrete is not supported");
  }

  /**
   * Clone of
   * https://github.com/whylabs/whylogs/blob/363336e664267631438853e29b524df5d284b37e/src/whylogs/util/stats.py#L7
   *
   * @param combinedAggregators
   * @return
   */
  @Nullable
  @Override
  public Object compute(Map<String, Object> combinedAggregators) {
    InferredTypePostAggregatorResultStructure type = null;

    if (inferredType != null) {
      type = (InferredTypePostAggregatorResultStructure) inferredType.compute(combinedAggregators);
    }

    Object o = numRecords.compute(combinedAggregators);
    long numR;
    if (o instanceof Integer || o instanceof Long) {
      numR = ((Number) o).longValue();
    } else {
      val clazzName =
          Optional.ofNullable(o) //
              .map(Object::getClass) //
              .map(Class::getSimpleName) //
              .orElse("null");
      throw new IAE("Cannot compute discrete value on type " + clazzName);
    }

    // Convert from HLL sketch parsed by Druid (and thus uses raw HLL sketch) to our HLL Sketch
    Object rawHll = cardinality.compute(combinedAggregators);
    final HllSketch sketch;
    if (rawHll instanceof org.apache.datasketches.hll.HllSketch) {
      val buf = ((org.apache.datasketches.hll.HllSketch) rawHll).toCompactByteArray();
      sketch = HllSketch.wrap(Memory.wrap(buf));
    } else {
      sketch = (HllSketch) rawHll;
    }

    return compute(sketch, numR, type.getType());
  }

  @Nullable
  public static Boolean compute(@Nullable HllSketch hll, Long numR, Type type) {
    // Always return non-discrete for fractional value
    if (type != null && type.getNumber() == InferredType.Type.FRACTIONAL.getNumber()) {
      return false;
    }
    // Strings and unknowns are always discrete
    if (type != null
        && (type.getNumber() == Type.STRING.getNumber()
            || type.getNumber() == Type.UNKNOWN.getNumber())) {
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

  @Nullable
  @Override
  @JsonProperty
  public String getName() {
    return name;
  }

  @Nullable
  @Override
  public ValueType getType() {
    return ValueType.LONG;
  }

  @JsonProperty
  public PostAggregator getNumRecords() {
    return numRecords;
  }

  @JsonProperty
  public InferredTypePostAggregator getInferredType() {
    return inferredType;
  }

  @JsonProperty
  public PostAggregator getCardinality() {
    return cardinality;
  }

  @NonNull
  @Override
  public PostAggregator decorate(Map<String, AggregatorFactory> aggregators) {
    return this;
  }

  @Override
  public byte[] getCacheKey() {
    final CacheKeyBuilder builder =
        new CacheKeyBuilder(CacheIdConstants.DISCRETE_POST_AGGREGATOR_CACHE_TYPE_ID)
            .appendCacheable(numRecords)
            .appendCacheable(cardinality);
    return builder.build();
  }
}
