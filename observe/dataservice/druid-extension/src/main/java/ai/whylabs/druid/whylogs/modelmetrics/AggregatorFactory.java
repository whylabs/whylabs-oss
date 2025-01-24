package ai.whylabs.druid.whylogs.modelmetrics;

import static ai.whylabs.druid.whylogs.CacheIdConstants.MODEL_METRICS_AGGREGATOR_FACTORY_CACHE_TYPE;

import ai.whylabs.druid.whylogs.column.DatasetMetrics;
import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.shaded.whylabs.org.apache.datasketches.quantiles.DoublesSketch;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import javax.annotation.Nullable;
import lombok.extern.slf4j.Slf4j;
import org.apache.druid.java.util.common.IAE;
import org.apache.druid.query.aggregation.AggregateCombiner;
import org.apache.druid.query.aggregation.Aggregator;
import org.apache.druid.query.aggregation.AggregatorFactoryNotMergeableException;
import org.apache.druid.query.aggregation.BufferAggregator;
import org.apache.druid.query.aggregation.ObjectAggregateCombiner;
import org.apache.druid.query.cache.CacheKeyBuilder;
import org.apache.druid.segment.ColumnSelectorFactory;
import org.apache.druid.segment.ColumnValueSelector;
import org.apache.druid.segment.NilColumnValueSelector;
import org.apache.druid.segment.column.ValueType;

@Slf4j
public class AggregatorFactory extends org.apache.druid.query.aggregation.AggregatorFactory {

  public static final byte CACHE_TYPE = MODEL_METRICS_AGGREGATOR_FACTORY_CACHE_TYPE;

  public static final Comparator<DruidModelMetrics> COMPARATOR =
      Comparator.nullsFirst(Comparator.comparing(DruidModelMetrics::toString));

  private final String name;
  private final String fieldName;
  private final byte cacheTypeId;

  @JsonCreator
  public AggregatorFactory(
      @JsonProperty("name") final String name, @JsonProperty("fieldName") final String fieldName) {
    this(name, fieldName, CACHE_TYPE);
  }

  AggregatorFactory(final String name, final String fieldName, final byte cacheTypeId) {
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
    final ColumnValueSelector<DruidModelMetrics> selector =
        metricFactory.makeColumnValueSelector(fieldName);
    if (selector instanceof NilColumnValueSelector) {
      return new NoopAggregator();
    }
    return new MergeAggregator(selector);
  }

  @Override
  public BufferAggregator factorizeBuffered(final ColumnSelectorFactory metricFactory) {
    final ColumnValueSelector<DruidModelMetrics> selector =
        metricFactory.makeColumnValueSelector(fieldName);
    if (selector instanceof NilColumnValueSelector) {
      return new NoopBufferAggregator();
    }
    return new MergeBufferAggregator(selector, getMaxIntermediateSizeWithNulls());
  }

  @Override
  public Object deserialize(final Object object) {
    return Operations.deserialize(object);
  }

  @Override
  public Comparator<DruidModelMetrics> getComparator() {
    return COMPARATOR;
  }

  @Override
  public Object combine(final Object lhs, final Object rhs) {
    final DruidModelMetrics left = (DruidModelMetrics) lhs;
    final DruidModelMetrics right = (DruidModelMetrics) rhs;
    DruidModelMetrics result = left;
    try {
      result = left.merge(right);
    } catch (Exception e) {
      log.error("AggregatorFactory.combine failed", e);
    }
    return result;
  }

  @Override
  public AggregateCombiner makeAggregateCombiner() {
    return new ObjectAggregateCombiner<DruidModelMetrics>() {
      private DruidModelMetrics union = null;

      @Override
      public void reset(final ColumnValueSelector selector) {
        union = null;
        fold(selector);
      }

      @Override
      public void fold(final ColumnValueSelector selector) {
        final DruidModelMetrics value = (DruidModelMetrics) selector.getObject();
        if (union == null) {
          union = value;
        } else if (value != null) {
          try {
            union = union.merge(value);
          } catch (Exception e) {
            log.error("AggregatorFactory.fold failed", e);
          }
        }
      }

      @Nullable
      @Override
      public DruidModelMetrics getObject() {
        return union;
      }

      @Override
      public Class<DruidModelMetrics> classOfObject() {
        return DruidModelMetrics.class;
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
    return maxDruidModelMetricsSize();
  }

  // declared static for access from tests
  public static int maxDruidModelMetricsSize() {
    // estimate derived from msg.getModeProfile().getMetrics().getScoreMatrix().getSerializedSize()
    // while ingesting model-9 profiles.  sizes range from 1668 - 2499 bytes.
    return 5000;
  }

  @Override
  public List<org.apache.druid.query.aggregation.AggregatorFactory> getRequiredColumns() {
    return Collections.singletonList(new AggregatorFactory(fieldName, fieldName));
  }

  @Override
  public org.apache.druid.query.aggregation.AggregatorFactory getCombiningFactory() {
    return new AggregatorFactory(name, name);
  }

  @Override
  public org.apache.druid.query.aggregation.AggregatorFactory getMergingFactory(
      org.apache.druid.query.aggregation.AggregatorFactory other)
      throws AggregatorFactoryNotMergeableException {
    if (other.getName().equals(this.getName()) && other instanceof AggregatorFactory) {
      return new AggregatorFactory(name, name);
    } else {
      throw new AggregatorFactoryNotMergeableException(this, other);
    }
  }

  @Nullable
  @Override
  // TODO parameterize by query parameter?
  public Object finalizeComputation(@Nullable final Object object) {
    return object;
  }

  @Override
  public String getComplexTypeName() {
    return DatasetMetrics.MODEL_METRICS;
  }

  /** actual type is {@link DoublesSketch} */
  @Override
  public ValueType getType() {
    return ValueType.COMPLEX;
  }

  @Override
  public ValueType getFinalizedType() {
    return ValueType.STRING;
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
    final AggregatorFactory that = (AggregatorFactory) o;
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
