package ai.whylabs.druid.whylogs.kll;

import static com.whylogs.core.SummaryConverters.fromUpdateDoublesSketch;

import ai.whylabs.druid.whylogs.CacheIdConstants;
import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.google.common.base.Preconditions;
import com.shaded.whylabs.com.google.protobuf.util.JsonFormat;
import com.shaded.whylabs.org.apache.datasketches.kll.KllDoublesSketch;
import com.shaded.whylabs.org.apache.datasketches.kll.KllFloatsSketch;
import com.whylogs.v0.core.message.HistogramSummary;
import java.util.Arrays;
import java.util.Comparator;
import java.util.Map;
import java.util.Set;
import javax.annotation.Nullable;
import lombok.SneakyThrows;
import org.apache.druid.java.util.common.IAE;
import org.apache.druid.query.aggregation.AggregatorFactory;
import org.apache.druid.query.aggregation.PostAggregator;
import org.apache.druid.query.cache.CacheKeyBuilder;
import org.apache.druid.segment.column.ValueType;

public class KllDoublesSketchToHistogramPostAggregator implements PostAggregator {
  static final int DEFAULT_NUM_BINS = 10;

  private final String name;
  private final PostAggregator field;
  private final double[] splitPoints;
  private final Integer numBins;

  @JsonCreator
  public KllDoublesSketchToHistogramPostAggregator(
      @JsonProperty("name") final String name,
      @JsonProperty("field") final PostAggregator field,
      @JsonProperty("splitPoints") @Nullable final double[] splitPoints,
      @JsonProperty("numBins") @Nullable final Integer numBins) {
    this.name = Preconditions.checkNotNull(name, "name is null");
    this.field = Preconditions.checkNotNull(field, "field is null");
    this.splitPoints = splitPoints;
    this.numBins = numBins;
    if (splitPoints != null && numBins != null) {
      throw new IAE("Cannot accept both 'splitPoints' and 'numBins'");
    }
  }

  @Override
  @SneakyThrows
  public Object compute(final Map<String, Object> combinedAggregators) {
    final KllDoublesSketch sketch = (KllDoublesSketch) field.compute(combinedAggregators);
    HistogramSummary summary;
    if (splitPoints != null) {
      summary = fromUpdateDoublesSketch(sketch, splitPoints);
    } else {
      summary =
          fromUpdateDoublesSketch(
              sketch, (numBins != null ? this.numBins.intValue() : DEFAULT_NUM_BINS));
    }
    return JsonFormat.printer().print(summary);
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

  @JsonProperty
  @JsonInclude(JsonInclude.Include.NON_NULL)
  public double[] getSplitPoints() {
    return splitPoints;
  }

  @JsonProperty
  @JsonInclude(JsonInclude.Include.NON_NULL)
  public Integer getNumBins() {
    return numBins;
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
    return getClass().getSimpleName()
        + "{"
        + "name='"
        + name
        + '\''
        + ", field="
        + field
        + ", splitPoints="
        + Arrays.toString(splitPoints)
        + ", numBins="
        + numBins
        + "}";
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
    if (!name.equals(that.name)) {
      return false;
    }
    if (!Arrays.equals(splitPoints, that.splitPoints)) {
      return false;
    }
    if (!field.equals(that.field)) {
      return false;
    }
    if (numBins == null && that.numBins == null) {
      return true;
    }
    if (numBins != null && numBins.equals(that.numBins)) {
      return true;
    }
    return false;
  }

  @Override
  public int hashCode() {
    int hashCode = name.hashCode() * 31 + field.hashCode();
    hashCode = hashCode * 31 + Arrays.hashCode(splitPoints);
    if (numBins != null) {
      hashCode = hashCode * 31 + numBins.hashCode();
    }
    return hashCode;
  }

  @Override
  public byte[] getCacheKey() {
    final CacheKeyBuilder builder =
        new CacheKeyBuilder(
                CacheIdConstants.KLL_FLOATS_SKETCH_TO_HISTOGRAM_POST_AGGREGATOR_CACHE_ID)
            .appendCacheable(field);
    if (splitPoints != null) {
      for (final double value : splitPoints) {
        builder.appendDouble(value);
      }
    }
    if (numBins != null) {
      builder.appendInt(numBins);
    }
    return builder.build();
  }

  @Override
  public PostAggregator decorate(final Map<String, AggregatorFactory> map) {
    return this;
  }
}
