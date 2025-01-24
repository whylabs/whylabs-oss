package ai.whylabs.druid.whylogs.frequency;

import ai.whylabs.druid.whylogs.CacheIdConstants;
import ai.whylabs.druid.whylogs.WhylogsExtensionsModule;
import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.shaded.whylabs.org.apache.datasketches.frequencies.ItemsSketch;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import javax.annotation.Nullable;
import lombok.extern.slf4j.Slf4j;
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

@Slf4j
public class FrequencyAggregatorFactory extends AggregatorFactory {
  public static final Comparator<StringItemSketch> COMPARATOR =
      Comparator.nullsFirst(
          Comparator.comparing(stringItemSketch -> stringItemSketch.get().getNumActiveItems()));

  private final String name;
  private final String fieldName;
  private final byte cacheTypeId;

  @JsonCreator
  public FrequencyAggregatorFactory(
      @JsonProperty("name") final String name, @JsonProperty("fieldName") final String fieldName) {
    this(name, fieldName, CacheIdConstants.FREQUENCY_AGGREGATOR_FACTORY_CACHE_TYPE);
  }

  FrequencyAggregatorFactory(final String name, final String fieldName, final byte cacheTypeId) {
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
    final ColumnValueSelector<StringItemSketch> selector =
        metricFactory.makeColumnValueSelector(fieldName);
    if (selector instanceof NilColumnValueSelector) {
      return new NoopFrequencyAggregator();
    }
    return new FrequencyMergeAggregator(selector);
  }

  @Override
  public BufferAggregator factorizeBuffered(final ColumnSelectorFactory metricFactory) {
    final ColumnValueSelector<StringItemSketch> selector =
        metricFactory.makeColumnValueSelector(fieldName);
    if (selector instanceof NilColumnValueSelector) {
      return new NoopFrequencyBufferAggregator();
    }
    return new FrequencyMergeBufferAggregator(selector, getMaxIntermediateSizeWithNulls());
  }

  @Override
  public Object deserialize(final Object object) {
    return FrequencyOperations.deserialize(object);
  }

  @Override
  public Comparator<StringItemSketch> getComparator() {
    return COMPARATOR;
  }

  @Override
  public Object combine(final Object lhs, final Object rhs) {
    final StringItemSketch left = StringItemSketch.as(lhs);
    final StringItemSketch right = StringItemSketch.as(rhs);
    ItemsSketch<String> result = left.get();
    try {
      result = left.get().merge(right.get());
    } catch (Exception e) {
      log.error("FrequencyAggregatorFactory.combine failed", e);
    }

    return result;
  }

  @Override
  public AggregateCombiner makeAggregateCombiner() {
    return new ObjectAggregateCombiner<StringItemSketch>() {
      private StringItemSketch union = null;

      @Override
      public void reset(final ColumnValueSelector selector) {
        union = null;
        fold(selector);
      }

      @Override
      public void fold(final ColumnValueSelector selector) {
        final StringItemSketch value = (StringItemSketch) selector.getObject();
        if (union == null) {
          union = value;

        } else if (value != null) {
          try {
            union.get().merge(value.get());
          } catch (Exception e) {
            log.error("FrequencyAggregatorFactory.fold failed", e);
          }
        }
      }

      @Nullable
      @Override
      public StringItemSketch getObject() {
        return union;
      }

      @Override
      public Class<StringItemSketch> classOfObject() {
        return StringItemSketch.class;
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

  @Override
  public int getMaxIntermediateSize() {
    /**
     * Magic number estimating maximum serialized size of StringItemSketch. Note each bucket gets
     * its own intermediate buffer, so its in our interest to keep this as small as possible less we
     * ramp up our memory pressure to the point that druid has to spill to disk.
     *
     * <p>20k chosen to accommodate some larger recent customer sketches.*
     */
    return 20 * (1 << 10);
  }

  @Override
  public List<AggregatorFactory> getRequiredColumns() {
    return Collections.singletonList(new FrequencyAggregatorFactory(fieldName, fieldName));
  }

  @Override
  public AggregatorFactory getCombiningFactory() {
    return new FrequencyAggregatorFactory(name, name);
  }

  @Override
  public AggregatorFactory getMergingFactory(AggregatorFactory other)
      throws AggregatorFactoryNotMergeableException {
    if (other.getName().equals(this.getName()) && other instanceof FrequencyAggregatorFactory) {
      return new FrequencyAggregatorFactory(name, name);
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
    return WhylogsExtensionsModule.FREQUENCY;
  }

  /** actual type is {@link StringItemSketch} */
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
  public int hashCode() {
    return Objects.hash(name, fieldName); // no need to use cacheTypeId here
  }

  @Override
  public String toString() {
    return getClass().getSimpleName() + "{" + "name=" + name + ", fieldName=" + fieldName + "}";
  }
}
