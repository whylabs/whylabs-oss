package ai.whylabs.druid.whylogs.kll;

import ai.whylabs.druid.whylogs.CacheIdConstants;
import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.shaded.whylabs.org.apache.datasketches.Util;
import com.shaded.whylabs.org.apache.datasketches.kll.KllDoublesSketch;
import java.util.Arrays;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import javax.annotation.Nullable;
import lombok.NonNull;
import lombok.SneakyThrows;
import lombok.val;
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

public class KllDoublesSketchAggregatorFactory extends AggregatorFactory {
  public static final Comparator<KllDoublesSketch> COMPARATOR =
      Comparator.nullsFirst(Comparator.comparingLong(KllDoublesSketch::getN));

  public static final int DEFAULT_K = 256;

  // KllFloatsSketch has internal depth limit <= 60, which is log2(stream_length).
  // so choose max length just below that limit.
  public static final long MAX_STREAM_LENGTH = ((1L << 61) - 1);

  private final String name;
  private final String fieldName;
  private final int k;
  private final double[] fractions;
  private final byte cacheTypeId;

  @JsonCreator
  public KllDoublesSketchAggregatorFactory(
      @JsonProperty("name") final String name,
      @JsonProperty("fieldName") final String fieldName,
      @JsonProperty("k") @Nullable
          final Integer k, // controls size of the sketch and accuracy of estimates
      @JsonProperty("fractions") final double[] fractions) {
    this(
        name,
        fieldName,
        k,
        fractions,
        CacheIdConstants.KLL_FLOATS_SKETCH_AGGREGATOR_FACTORY_CACHE_TYPE);
  }

  KllDoublesSketchAggregatorFactory(
      final String name,
      final String fieldName,
      final Integer k,
      final double[] fractions,
      final byte cacheTypeId) {
    if (name == null) {
      throw new IAE("Must have a valid, non-null aggregator name");
    }
    this.name = name;
    if (fieldName == null) {
      throw new IAE("Parameter fieldName must be specified");
    }
    this.fieldName = fieldName;
    this.k = k == null ? DEFAULT_K : k;
    Util.checkIfPowerOf2(this.k, "k");
    this.fractions = fractions;
    this.cacheTypeId = cacheTypeId;
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

  @JsonProperty
  public int getK() {
    return k;
  }

  @JsonProperty
  public double[] getFractions() {
    return fractions;
  }

  @Override
  @NonNull
  public List<String> requiredFields() {
    return Collections.singletonList(fieldName);
  }

  @Override
  @NonNull
  public Aggregator factorize(final ColumnSelectorFactory metricFactory) {
    final ColumnValueSelector<KllDoublesSketch> selector =
        metricFactory.makeColumnValueSelector(fieldName);
    if (selector instanceof NilColumnValueSelector) {
      return new NoopKllDoublesSketchAggregator();
    }
    return new KllDoublesSketchMergeAggregator(selector, k);
  }

  @Override
  @NonNull
  public BufferAggregator factorizeBuffered(final ColumnSelectorFactory metricFactory) {
    final ColumnValueSelector<KllDoublesSketch> selector =
        metricFactory.makeColumnValueSelector(fieldName);
    if (selector instanceof NilColumnValueSelector) {
      return new NoopKllDoublesSketchBufferAggregator();
    }
    return new KllDoublesSketchMergeBufferAggregator(selector, getMaxIntermediateSizeWithNulls());
  }

  @Override
  @NonNull
  public Object deserialize(@NonNull final Object object) {
    return KllDoublesSketchOperations.deserialize(object);
  }

  @Override
  @NonNull
  public Comparator<KllDoublesSketch> getComparator() {
    return COMPARATOR;
  }

  @SneakyThrows
  private static boolean checkOverflow(final Object a, final Object b) {
    return KllUtils.overflow((KllDoublesSketch) a, (KllDoublesSketch) b);
  }

  /**
   * Combine the outputs of {@link Aggregator#get} produced via {@link #factorize} or {@link
   * BufferAggregator#get} produced via {@link #factorizeBuffered}.
   */
  @Override
  public Object combine(final Object lhs, final Object rhs) {
    val lsk = (KllDoublesSketch) lhs;
    val rsk = (KllDoublesSketch) rhs;
    final KllDoublesSketch union = new KllDoublesSketch(Math.max(lsk.getK(), rsk.getK()));
    try {
      if (!checkOverflow(union, lhs)) {
        union.merge(lsk);
      }
      if (!checkOverflow(union, rhs)) {
        union.merge(rsk);
      }
    } catch (Exception e) {
    }
    return union;
  }

  @Override
  @NonNull
  public AggregateCombiner makeAggregateCombiner() {
    return new ObjectAggregateCombiner<KllDoublesSketch>() {
      private KllDoublesSketch union = new KllDoublesSketch(k);

      @Override
      public void reset(@NonNull final ColumnValueSelector selector) {
        union = null;
        fold(selector);
      }

      @Override
      @SneakyThrows
      public void fold(final ColumnValueSelector selector) {
        final KllDoublesSketch sketch = (KllDoublesSketch) selector.getObject();
        if (union == null) {
          union = sketch;
        } else if (sketch != null) {
          try {
            if (!KllUtils.overflow(union, sketch)) {
              union.merge(sketch);
            }
          } catch (Exception e) {
          }
        }
      }

      @Nullable
      @Override
      public KllDoublesSketch getObject() {
        return union;
      }

      @Override
      @NonNull
      public Class<KllDoublesSketch> classOfObject() {
        return KllDoublesSketch.class;
      }
    };
  }

  // Quantiles sketches never stop growing, but they do so very slowly.
  // Max size is determined by max stream length, which is bounded by
  // max value that fits in a Long.
  @Override
  public int getMaxIntermediateSize() {
    return maxKllDoublesSketchSize();
  }

  // declared static for access from tests
  public static int maxKllDoublesSketchSize() {
    return KllDoublesSketch.getMaxSerializedSizeBytes(DEFAULT_K, MAX_STREAM_LENGTH);
  }

  @Override
  @NonNull
  public List<AggregatorFactory> getRequiredColumns() {
    return Collections.singletonList(
        new KllDoublesSketchAggregatorFactory(fieldName, fieldName, k, fractions));
  }

  @Override
  @NonNull
  public AggregatorFactory getCombiningFactory() {
    return new KllDoublesSketchAggregatorFactory(name, name, k, fractions);
  }

  @Override
  @NonNull
  public AggregatorFactory getMergingFactory(AggregatorFactory other)
      throws AggregatorFactoryNotMergeableException {
    if (other.getName().equals(this.getName())
        && other instanceof KllDoublesSketchAggregatorFactory) {
      return new KllDoublesSketchAggregatorFactory(name, name, k, fractions);
    } else {
      throw new AggregatorFactoryNotMergeableException(this, other);
    }
  }

  @Nullable
  @Override
  public Object finalizeComputation(@Nullable final Object object) {
    /*
    If the user supplied "fractions", output quantiles, e.g. [672.66595,1640.3217,1931.8275,2474.7]
    Otherwise output raw datasketch that will be base-64 encoded.
    */
    val sketch = (KllDoublesSketch) object;
    if (sketch == null) {
      return null;
    }
    if (fractions != null) {
      if (sketch.isEmpty()) {
        final double[] quantiles = new double[fractions.length];
        Arrays.fill(quantiles, Double.NaN);
        return quantiles;
      }
      return sketch.getQuantiles(fractions);
    }
    return sketch;
  }

  @Override
  @NonNull
  public ValueType getFinalizedType() {
    /*
    If the user supplied "fractions", output quantiles, e.g. [672.66595,1640.3217,1931.8275,2474.7]
    Otherwise output raw datasketch that will be base-64 encoded.
    */
    if (fractions != null) {
      return ValueType.DOUBLE_ARRAY;
    }
    return ValueType.COMPLEX;
  }

  @Override
  @NonNull
  public String getComplexTypeName() {
    return KllDoublesSketchModule.KLL_SKETCH;
  }

  /** actual type is {@link KllDoublesSketch} */
  @Override
  @NonNull
  public ValueType getType() {
    return ValueType.COMPLEX;
  }

  @Override
  public byte[] getCacheKey() {
    return new CacheKeyBuilder(cacheTypeId)
        .appendString(name)
        .appendString(fieldName)
        .appendInt(k)
        .build();
  }

  @Override
  public boolean equals(final Object o) {
    if (this == o) {
      return true;
    }
    if (o == null || !getClass().equals(o.getClass())) {
      return false;
    }
    final KllDoublesSketchAggregatorFactory that = (KllDoublesSketchAggregatorFactory) o;
    if (!name.equals(that.name)) {
      return false;
    }
    if (!fieldName.equals(that.fieldName)) {
      return false;
    }
    return k == that.k;
  }

  @Override
  public int hashCode() {
    return Objects.hash(name, fieldName, k); // no need to use cacheTypeId here
  }

  @Override
  public String toString() {
    return getClass().getSimpleName()
        + "{"
        + "name="
        + name
        + ", fieldName="
        + fieldName
        + ", k="
        + k
        + "}";
  }
}
