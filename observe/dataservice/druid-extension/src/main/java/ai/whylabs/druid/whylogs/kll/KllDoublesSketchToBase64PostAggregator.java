package ai.whylabs.druid.whylogs.kll;

import ai.whylabs.druid.whylogs.CacheIdConstants;
import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.google.common.base.Preconditions;
import com.shaded.whylabs.org.apache.datasketches.kll.KllDoublesSketch;
import com.shaded.whylabs.org.apache.datasketches.kll.KllFloatsSketch;
import java.util.Base64;
import java.util.Comparator;
import java.util.Map;
import java.util.Set;
import lombok.SneakyThrows;
import org.apache.druid.java.util.common.IAE;
import org.apache.druid.query.aggregation.AggregatorFactory;
import org.apache.druid.query.aggregation.PostAggregator;
import org.apache.druid.query.cache.CacheKeyBuilder;
import org.apache.druid.segment.column.ValueType;

/** Used by ad-hoc monitor which needs access to the sketches */
public class KllDoublesSketchToBase64PostAggregator implements PostAggregator {
  private final String name;
  private final PostAggregator field;

  @JsonCreator
  public KllDoublesSketchToBase64PostAggregator(
      @JsonProperty("name") final String name, @JsonProperty("field") final PostAggregator field) {
    this.name = Preconditions.checkNotNull(name, "name is null");
    this.field = Preconditions.checkNotNull(field, "field is null");
  }

  @Override
  @SneakyThrows
  public Object compute(final Map<String, Object> combinedAggregators) {
    final KllDoublesSketch sketch = (KllDoublesSketch) field.compute(combinedAggregators);
    return Base64.getEncoder().encodeToString(sketch.toByteArray());
  }

  @Override
  @JsonProperty
  public String getName() {
    return name;
  }

  /** actual type is {@link KllFloatsSketch} */
  @Override
  public ValueType getType() {
    return ValueType.STRING;
  }

  @JsonProperty
  public PostAggregator getField() {
    return field;
  }

  @Override
  public Comparator<double[]> getComparator() {
    throw new IAE("Comparing histograms is not supported");
  }

  @Override
  public Set<String> getDependentFields() {
    return field.getDependentFields();
  }

  @Override
  public String toString() {
    return getClass().getSimpleName() + "{" + "name='" + name + '\'' + ", field=" + field + "}";
  }

  @Override
  public boolean equals(final Object o) {
    if (this == o) {
      return true;
    }
    if (o == null || getClass() != o.getClass()) {
      return false;
    }
    final KllDoublesSketchToHistogramPostAggregator that =
        (KllDoublesSketchToHistogramPostAggregator) o;
    return false;
  }

  @Override
  public int hashCode() {
    int hashCode = name.hashCode() * 31 + field.hashCode();
    return hashCode;
  }

  @Override
  public byte[] getCacheKey() {
    final CacheKeyBuilder builder =
        new CacheKeyBuilder(CacheIdConstants.KLL_FLOATS_SKETCH_TO_BASE64_POST_AGGREGATOR_CACHE_ID)
            .appendCacheable(field);
    return builder.build();
  }

  @Override
  public PostAggregator decorate(final Map<String, AggregatorFactory> map) {
    return this;
  }
}
