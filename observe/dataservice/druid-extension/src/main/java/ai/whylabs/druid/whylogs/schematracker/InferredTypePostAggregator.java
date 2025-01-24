package ai.whylabs.druid.whylogs.schematracker;

import ai.whylabs.druid.whylogs.CacheIdConstants;
import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.google.common.base.Preconditions;
import com.google.common.collect.Sets;
import com.whylogs.v0.core.message.InferredType;
import com.whylogs.v0.core.message.InferredType.Type;
import java.util.Comparator;
import java.util.HashMap;
import java.util.Map;
import java.util.Map.Entry;
import java.util.Set;
import javax.annotation.Nullable;
import lombok.val;
import org.apache.druid.java.util.common.IAE;
import org.apache.druid.query.aggregation.AggregatorFactory;
import org.apache.druid.query.aggregation.PostAggregator;
import org.apache.druid.query.cache.CacheKeyBuilder;
import org.apache.druid.segment.column.ValueType;

public class InferredTypePostAggregator implements PostAggregator {

  private String name;
  private PostAggregator typeCountUnknown;
  private PostAggregator typeCountFractional;
  private PostAggregator typeCountIntegral;
  private PostAggregator typeCountBoolean;
  private PostAggregator typeCountString;

  private PostAggregator nullCount;
  // https://github.com/whylabs/whylogs/blob/6ac241a61dec14d129b10c3985275a1bb056e588/src/whylogs/core/statistics/schematracker.py#L21
  private static double CANDIDATE_MIN_FRAC = 0.7;

  private Set<String> dependentFields;

  @JsonCreator
  public InferredTypePostAggregator(
      @JsonProperty("name") final String name,
      @JsonProperty("typeCountUnknown") final PostAggregator typeCountUnknown,
      @JsonProperty("typeCountFractional") final PostAggregator typeCountFractional,
      @JsonProperty("typeCountIntegral") final PostAggregator typeCountIntegral,
      @JsonProperty("typeCountBoolean") final PostAggregator typeCountBoolean,
      @JsonProperty("typeCountString") final PostAggregator typeCountString,
      @JsonProperty("nullCount") final PostAggregator nullCount) {

    this.name = Preconditions.checkNotNull(name, "Name must not be null");
    this.typeCountUnknown =
        Preconditions.checkNotNull(typeCountUnknown, "typeCountUnknown is null");
    this.typeCountFractional =
        Preconditions.checkNotNull(typeCountFractional, "typeCountFractional is null");
    this.typeCountIntegral =
        Preconditions.checkNotNull(typeCountIntegral, "typeCountIntegral is null");
    this.typeCountBoolean =
        Preconditions.checkNotNull(typeCountBoolean, "typeCountBoolean is null");
    this.typeCountString = Preconditions.checkNotNull(typeCountString, "typeCountString is null");
    this.nullCount = Preconditions.checkNotNull(nullCount, "nullCount is null");
  }

  @Override
  public Set<String> getDependentFields() {
    if (dependentFields == null) {
      dependentFields = Sets.newHashSet();
      dependentFields.addAll(typeCountUnknown.getDependentFields());
      dependentFields.addAll(typeCountFractional.getDependentFields());
      dependentFields.addAll(typeCountIntegral.getDependentFields());
      dependentFields.addAll(typeCountBoolean.getDependentFields());
      dependentFields.addAll(typeCountString.getDependentFields());
      dependentFields.addAll(nullCount.getDependentFields());
    }
    return dependentFields;
  }

  @Override
  public Comparator getComparator() {
    throw new IAE("Comparing schema tracker is not supported");
  }

  private Long asLong(Object o) {
    if (o == null) {
      return 0L;
    } else if (o instanceof Integer) {
      return new Long((Integer) o);
    } else if (o instanceof Long) {
      return (Long) o;
    } else {
      throw new IllegalArgumentException("Unhandled input type " + o.getClass());
    }
  }

  /**
   * Clone of
   * https://github.com/whylabs/whylogs/blob/6ac241a61dec14d129b10c3985275a1bb056e588/src/whylogs/core/statistics/schematracker.py#L31
   *
   * @param combinedAggregators
   * @return
   */
  @Nullable
  @Override
  public Object compute(Map<String, Object> combinedAggregators) {
    Map<InferredType.Type, Long> typeCounts = new HashMap<>();
    typeCounts.put(Type.UNKNOWN, asLong(typeCountUnknown.compute(combinedAggregators)));
    typeCounts.put(Type.FRACTIONAL, asLong(typeCountFractional.compute(combinedAggregators)));
    typeCounts.put(Type.INTEGRAL, asLong(typeCountIntegral.compute(combinedAggregators)));
    typeCounts.put(Type.BOOLEAN, asLong(typeCountBoolean.compute(combinedAggregators)));
    typeCounts.put(Type.STRING, asLong(typeCountString.compute(combinedAggregators)));
    Long nulls = asLong(nullCount.compute(combinedAggregators));
    return compute(typeCounts, nulls);
  }

  public static InferredTypePostAggregatorResultStructure compute(
      Map<InferredType.Type, Long> typeCounts, Long nulls) {
    Long total = 0L;
    for (Entry<Type, Long> entry : typeCounts.entrySet()) {
      total += entry.getValue();
    }

    if (total == 0) {
      if (nulls > 0) {
        return InferredTypePostAggregatorResultStructure.builder()
            .ratio(0.0)
            .type(Type.NULL)
            .build();
      } else {
        return InferredTypePostAggregatorResultStructure.builder()
            .ratio(0.0)
            .type(Type.UNKNOWN)
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
    if (typeCounts.get(Type.INTEGRAL) != null) {
      integers = typeCounts.get(Type.INTEGRAL);
    }
    if (typeCounts.get(Type.FRACTIONAL) != null) {
      fractions = typeCounts.get(Type.FRACTIONAL);
    }
    if (typeCounts.get(Type.STRING) != null) {
      strings = typeCounts.get(Type.STRING);
    }
    if (typeCounts.get(Type.BOOLEAN) != null) {
      booleans = typeCounts.get(Type.BOOLEAN);
    }

    // Integral is considered a subset of fractional here
    long fractionalCount = integers + fractions;
    if (candidate.getType().equals(Type.STRING) && strings > fractionalCount) {
      long coercedCount = integers + fractions + strings + booleans;
      double actualRatio = (double) coercedCount / total;
      return InferredTypePostAggregatorResultStructure.builder()
          .type(Type.STRING)
          .ratio(actualRatio)
          .build();
    }

    if (candidate.getRatio() >= .5) {
      // Not a string, but something else with a majority
      long actualCount = typeCounts.get(candidate.getType());
      if (candidate.getType().equals(Type.FRACTIONAL)) {
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
          .type(Type.FRACTIONAL)
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
    InferredType.Type itemType = Type.UNKNOWN;
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
    return InferredTypePostAggregatorResultStructure.builder().type(itemType).ratio(ratio).build();
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
    return ValueType.COMPLEX;
  }

  @JsonProperty
  public PostAggregator getTypeCountUnknown() {
    return typeCountUnknown;
  }

  @JsonProperty
  public PostAggregator getTypeCountFractional() {
    return typeCountFractional;
  }

  @JsonProperty
  public PostAggregator getTypeCountIntegral() {
    return typeCountIntegral;
  }

  @JsonProperty
  public PostAggregator getTypeCountBoolean() {
    return typeCountBoolean;
  }

  @JsonProperty
  public PostAggregator getTypeCountString() {
    return typeCountString;
  }

  @JsonProperty
  public PostAggregator getNullCount() {
    return nullCount;
  }

  @Override
  public PostAggregator decorate(Map<String, AggregatorFactory> aggregators) {
    return this;
  }

  @Override
  public byte[] getCacheKey() {
    final CacheKeyBuilder builder =
        new CacheKeyBuilder(CacheIdConstants.INFERRED_TYPE_POST_AGGREGATOR_CACHE_TYPE_ID);
    return builder.build();
  }
}
