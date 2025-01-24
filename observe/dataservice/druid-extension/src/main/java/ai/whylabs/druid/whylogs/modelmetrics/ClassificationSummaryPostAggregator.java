package ai.whylabs.druid.whylogs.modelmetrics;

import ai.whylabs.druid.whylogs.CacheIdConstants;
import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.google.common.base.Preconditions;
import java.util.Comparator;
import java.util.Map;
import java.util.Set;
import lombok.val;
import org.apache.druid.java.util.common.IAE;
import org.apache.druid.query.aggregation.AggregatorFactory;
import org.apache.druid.query.aggregation.PostAggregator;
import org.apache.druid.query.cache.CacheKeyBuilder;
import org.apache.druid.segment.column.ValueType;

public class ClassificationSummaryPostAggregator implements PostAggregator {
  // avoid conflicts with
  // org.apache.druid.query.aggregation.post.PostAggregatorIds

  private final String name;
  private final PostAggregator field;

  @JsonCreator
  public ClassificationSummaryPostAggregator(
      @JsonProperty("name") final String name, @JsonProperty("field") final PostAggregator field) {
    this.name = Preconditions.checkNotNull(name, "name is null");
    this.field = Preconditions.checkNotNull(field, "field is null");
  }

  @Override
  public Object compute(final Map<String, Object> combinedAggregators) {
    val dmm = (DruidModelMetrics) field.compute(combinedAggregators);
    if (dmm == null) {
      return null;
    }
    val dcm = dmm.getClassificationMetrics();
    return dcm == null ? null : dcm.toSummary();
  }

  @Override
  @JsonProperty
  public String getName() {
    return name;
  }

  /** actual type is {@link ConfusionMatrix} */
  @Override
  public ValueType getType() {
    return ValueType.COMPLEX;
  }

  @JsonProperty
  public PostAggregator getField() {
    return field;
  }

  @Override
  public Comparator<double[]> getComparator() {
    throw new IAE("Comparing confusion matrices is not supported");
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
    final ClassificationSummaryPostAggregator that = (ClassificationSummaryPostAggregator) o;
    if (!name.equals(that.name)) {
      return false;
    }
    if (!field.equals(that.field)) {
      return false;
    }
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
        new CacheKeyBuilder(CacheIdConstants.CONFUSION_MATRIX_CACHE_ID).appendCacheable(field);
    return builder.build();
  }

  @Override
  public PostAggregator decorate(final Map<String, AggregatorFactory> map) {
    return this;
  }
}
