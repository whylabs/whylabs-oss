package ai.whylabs.druid.whylogs.frequency;

import ai.whylabs.druid.whylogs.CacheIdConstants;
import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.google.common.base.Preconditions;
import com.shaded.whylabs.org.apache.datasketches.frequencies.ErrorType;
import com.shaded.whylabs.org.apache.datasketches.frequencies.ItemsSketch.Row;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import org.apache.druid.java.util.common.IAE;
import org.apache.druid.query.aggregation.AggregatorFactory;
import org.apache.druid.query.aggregation.PostAggregator;
import org.apache.druid.query.cache.CacheKeyBuilder;
import org.apache.druid.segment.column.ValueType;

/**
 * This postAggregator pretty much just dumps out all the information baked into an ItemsSketch into
 * json format for clean output. For example
 *
 * <p>{ "queryType": "groupBy", "dataSource": "whylogs", "granularity": "ALL", "dimensions":
 * ["columnName"], "aggregations": [ { "type": "frequentItemsMerge", "name": "frequentItems",
 * "fieldName": "frequentItems"} ], "postAggregations" : [{ "type" : "frequentItemsMergeToString",
 * "name" : "frequentItemsCount", "field" : { "type" : "fieldAccess", "name" : "frequentItems",
 * "fieldName" : "frequentItems" } }],
 *
 * <p>"intervals": [ "2019-04-01T00:00:00.000/2025-04-30T00:00:00.000" ] }
 *
 * <p>Produces
 *
 * <p>{ "version": "v1", "timestamp": "2019-04-01T00:00:00.000Z", "event": { "frequentItemsCount": {
 * "numActive": 11, "mapCapacity": 12, "maxError": 0, "items": { "\"Vacation\"": { "lb": 898, "est":
 * 898, "ub": 898 }, "\"Other\"": { "lb": 6280, "est": 6280, "ub": 6280 }, "\"Home buying\"": {
 * "lb": 420, "est": 420, "ub": 420 }, "\"Credit card refinancing\"": { "lb": 15172, "est": 15172,
 * "ub": 15172 }, "\"Major purchase\"": { "lb": 1218, "est": 1218, "ub": 1218 }, "\"Business\"": {
 * "lb": 510, "est": 510, "ub": 510 }, "\"Moving and relocation\"": { "lb": 562, "est": 562, "ub":
 * 562 }, "\"Car financing\"": { "lb": 726, "est": 726, "ub": 726 }, "\"Debt consolidation\"": {
 * "lb": 37902, "est": 37902, "ub": 37902 },...
 */
public class FrequencyToStringPostAggregator implements PostAggregator {

  private final String name;
  private final PostAggregator field;

  @JsonCreator
  public FrequencyToStringPostAggregator(
      @JsonProperty("name") final String name, @JsonProperty("field") final PostAggregator field) {

    this.name = Preconditions.checkNotNull(name, "name is null");
    this.field = Preconditions.checkNotNull(field, "field is null");
  }

  @Override
  @JsonProperty
  public String getName() {
    return name;
  }

  @Override
  public ValueType getType() {
    return ValueType.STRING;
  }

  @JsonProperty
  public PostAggregator getField() {
    return field;
  }

  @Override
  public Object compute(final Map<String, Object> combinedAggregators) {
    final StringItemSketch stringItemSketch =
        StringItemSketch.as(field.compute(combinedAggregators));

    Map<String, Object> freq = new LinkedHashMap<>();
    List<Row<String>> sorted =
        new ArrayList(
            Arrays.asList(stringItemSketch.get().getFrequentItems(ErrorType.NO_FALSE_NEGATIVES)));
    Collections.sort(
        sorted,
        (o1, o2) -> {
          Long l = o1.getEstimate();
          Long r = o2.getEstimate();
          return r.compareTo(l);
        });

    for (Row<String> r : sorted) {
      Map<String, Object> itemMap = new HashMap<>();
      itemMap.put("est", r.getEstimate());
      itemMap.put("lb", r.getLowerBound());
      itemMap.put("ub", r.getUpperBound());
      freq.put(r.getItem(), itemMap);
    }

    Map<String, Object> container = new HashMap<>();
    container.put("items", freq);
    container.put("numActive", stringItemSketch.get().getNumActiveItems());
    container.put("mapCapacity", stringItemSketch.get().getCurrentMapCapacity());
    container.put("maxError", stringItemSketch.get().getMaximumError());
    return container;
  }

  @Override
  public Comparator<String> getComparator() {
    throw new IAE("Comparing sketch summaries is not supported");
  }

  @Override
  public byte[] getCacheKey() {
    final CacheKeyBuilder builder =
        new CacheKeyBuilder(CacheIdConstants.FREQUENCY_TO_STRING_POST_AGGREGATOR_CACHE_ID)
            .appendCacheable(field);
    return builder.build();
  }

  @Override
  public PostAggregator decorate(final Map<String, AggregatorFactory> map) {
    return this;
  }

  @Override
  public Set<String> getDependentFields() {
    return field.getDependentFields();
  }

  @Override
  public String toString() {
    return this.getClass().getSimpleName()
        + "{"
        + "name='"
        + name
        + '\''
        + ", field="
        + field
        + "}";
  }

  @Override
  public boolean equals(Object o) {
    if (this == o) {
      return true;
    }
    if (o == null || getClass() != o.getClass()) {
      return false;
    }
    FrequencyToStringPostAggregator that = (FrequencyToStringPostAggregator) o;
    return name.equals(that.name) && field.equals(that.field);
  }

  @Override
  public int hashCode() {
    return Objects.hash(name, field);
  }
}
