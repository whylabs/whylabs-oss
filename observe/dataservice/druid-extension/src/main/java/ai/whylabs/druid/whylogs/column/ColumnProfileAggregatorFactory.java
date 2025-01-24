package ai.whylabs.druid.whylogs.column;

import ai.whylabs.druid.whylogs.CacheIdConstants;
import ai.whylabs.druid.whylogs.WhylogsExtensionsModule;
import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.shaded.whylabs.org.apache.datasketches.quantiles.DoublesSketch;
import com.whylogs.core.ColumnProfile;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import javax.annotation.Nullable;
import org.apache.druid.java.util.common.IAE;
import org.apache.druid.query.aggregation.AggregateCombiner;
import org.apache.druid.query.aggregation.Aggregator;
import org.apache.druid.query.aggregation.AggregatorFactory;
import org.apache.druid.query.aggregation.AggregatorFactoryNotMergeableException;
import org.apache.druid.query.aggregation.BufferAggregator;
import org.apache.druid.query.aggregation.ObjectAggregateCombiner;
import org.apache.druid.query.cache.CacheKeyBuilder;
import org.apache.druid.segment.ColumnSelectorFactory;
import org.apache.druid.segment.ColumnValueSelector;
import org.apache.druid.segment.NilColumnValueSelector;
import org.apache.druid.segment.column.ValueType;

public class ColumnProfileAggregatorFactory extends AggregatorFactory {
  public static final Comparator<ColumnProfile> COMPARATOR =
      Comparator.nullsFirst(Comparator.comparing(ColumnProfile::getColumnName));

  private final String name;
  private final String fieldName;
  private final byte cacheTypeId;

  @JsonCreator
  public ColumnProfileAggregatorFactory(
      @JsonProperty("name") final String name, @JsonProperty("fieldName") final String fieldName) {
    this(name, fieldName, CacheIdConstants.COLUMN_PROFILE_AGGREGATOR_FACTORY_CACHE_TYPE);
  }

  ColumnProfileAggregatorFactory(
      final String name, final String fieldName, final byte cacheTypeId) {
    if (name == null) {
      throw new IAE("Must have a valid, non-null aggregator name");
    }
    this.name = name;
    if (fieldName == null) {
      throw new IAE("Parameter fieldName must be specified");
    }
    this.fieldName = fieldName;
    this.cacheTypeId = cacheTypeId;
  }

  @Override
  public Aggregator factorize(final ColumnSelectorFactory metricFactory) {
    final ColumnValueSelector<ColumnProfile> selector =
        metricFactory.makeColumnValueSelector(fieldName);
    if (selector instanceof NilColumnValueSelector) {
      return new NoopColumnProfileAggregator();
    }
    return new ColumnProfileMergeAggregator(selector);
  }

  @Override
  public BufferAggregator factorizeBuffered(final ColumnSelectorFactory metricFactory) {
    final ColumnValueSelector<ColumnProfile> selector =
        metricFactory.makeColumnValueSelector(fieldName);
    if (selector instanceof NilColumnValueSelector) {
      return new NoopColumnProfileBufferAggregator();
    }
    return new ColumnProfileMergeBufferAggregator(selector);
  }

  @Override
  public Object deserialize(final Object object) {
    return ColumnProfileOperations.deserialize(object);
  }

  @Override
  public Comparator<ColumnProfile> getComparator() {
    return COMPARATOR;
  }

  @Override
  public Object combine(final Object lhs, final Object rhs) {
    final ColumnProfile left = (ColumnProfile) lhs;
    final ColumnProfile right = (ColumnProfile) rhs;
    ColumnProfile result = left;
    try {
      result = left.merge(right);
    } catch (Exception e) {
    }
    return result;
  }

  @Override
  public AggregateCombiner makeAggregateCombiner() {
    return new ObjectAggregateCombiner<ColumnProfile>() {
      private ColumnProfile union = null;

      @Override
      public void reset(final ColumnValueSelector selector) {
        union = null;
        fold(selector);
      }

      @Override
      public void fold(final ColumnValueSelector selector) {
        final ColumnProfile value = (ColumnProfile) selector.getObject();
        if (union == null) {
          union = value;
        } else if (value != null) {
          try {
            union = union.merge(value);
          } catch (Exception e) {
          }
        }
      }

      @Nullable
      @Override
      public ColumnProfile getObject() {
        return union;
      }

      @Override
      public Class<ColumnProfile> classOfObject() {
        return ColumnProfile.class;
      }
    };
  }

  @Override
  @JsonProperty
  public String getName() {
    return name;
  }

  @JsonProperty
  public String getFieldName() {
    return fieldName;
  }

  @Override
  public List<String> requiredFields() {
    return Collections.singletonList(fieldName);
  }

  // Quantiles sketches never stop growing, but they do so very slowly.
  // This size must suffice for overwhelming majority of sketches,
  // but some sketches may request more memory on heap and move there
  @Override
  public int getMaxIntermediateSize() {
    return 9999999;
  }

  @Override
  public List<AggregatorFactory> getRequiredColumns() {
    return Collections.singletonList(new ColumnProfileAggregatorFactory(fieldName, fieldName));
  }

  @Override
  public AggregatorFactory getCombiningFactory() {
    return new ColumnProfileAggregatorFactory(name, name);
  }

  @Override
  public AggregatorFactory getMergingFactory(AggregatorFactory other)
      throws AggregatorFactoryNotMergeableException {
    if (other.getName().equals(this.getName()) && other instanceof ColumnProfileAggregatorFactory) {
      // DoublesUnion supports inputs with different k.
      // The result will have effective k between the specified k and the minimum k from all
      // input
      // sketches
      // to achieve higher accuracy as much as possible.
      return new ColumnProfileAggregatorFactory(name, name);
    } else {
      throw new AggregatorFactoryNotMergeableException(this, other);
    }
  }

  @Nullable
  @Override
  public Object finalizeComputation(@Nullable final Object object) {
    return object;
  }

  @Override
  public String getComplexTypeName() {
    return WhylogsExtensionsModule.COLUMN_PROFILE;
  }

  /** actual type is {@link DoublesSketch} */
  @Override
  public ValueType getType() {
    return ValueType.COMPLEX;
  }

  @Override
  public ValueType getFinalizedType() {
    return ValueType.LONG;
  }

  @Override
  public byte[] getCacheKey() {
    return new CacheKeyBuilder(cacheTypeId).appendString(name).appendString(fieldName).build();
  }

  @Override
  public boolean equals(final Object o) {
    if (this == o) {
      return true;
    }
    if (o == null || !getClass().equals(o.getClass())) {
      return false;
    }
    final ColumnProfileAggregatorFactory that = (ColumnProfileAggregatorFactory) o;
    if (!name.equals(that.name)) {
      return false;
    }
    return fieldName.equals(that.fieldName);
  }

  @Override
  public int hashCode() {
    return Objects.hash(name, fieldName); // no need to use cacheTypeId here
  }

  @Override
  public String toString() {
    return getClass().getSimpleName() + "{" + "name=" + name + ", fieldName=" + fieldName + "}";
  }
}
