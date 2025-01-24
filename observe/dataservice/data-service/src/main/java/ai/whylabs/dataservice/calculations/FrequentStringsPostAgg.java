package ai.whylabs.dataservice.calculations;

import static ai.whylabs.dataservice.calculations.PostAggregators.FREQUENT_STRINGS_METRIC_PATH;

import ai.whylabs.dataservice.responses.ColumnMetric;
import ai.whylabs.druid.whylogs.util.DruidStringUtils;
import com.shaded.whylabs.org.apache.datasketches.ArrayOfStringsSerDe;
import com.shaded.whylabs.org.apache.datasketches.frequencies.ErrorType;
import com.shaded.whylabs.org.apache.datasketches.frequencies.ItemsSketch;
import com.shaded.whylabs.org.apache.datasketches.frequencies.ItemsSketch.Row;
import com.shaded.whylabs.org.apache.datasketches.memory.Memory;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import javax.annotation.Nonnull;
import lombok.Builder;
import lombok.SneakyThrows;
import lombok.val;

@Builder
public class FrequentStringsPostAgg {

  private static final ArrayOfStringsSerDe ARRAY_OF_STRINGS_SER_DE = new ArrayOfStringsSerDe();

  public static ItemsSketch<String> emptySketch() {
    return new ItemsSketch<String>((int) Math.pow(2.0, 7.0));
  }

  @Nonnull
  public static ItemsSketch<String> deserialize(byte[] data) {
    return data.length > 8
        ? (ItemsSketch<String>) ItemsSketch.getInstance(Memory.wrap(data), ARRAY_OF_STRINGS_SER_DE)
        : emptySketch();
  }

  public static ItemsSketch<String> deserialize(String str) {
    final byte[] bytes = DruidStringUtils.decodeBase64(str.getBytes(StandardCharsets.UTF_8));
    return deserialize(bytes);
  }

  @SneakyThrows
  Map<String, ColumnMetric> calculate(Map<String, ColumnMetric> metrics) {

    val row = metrics.get(FREQUENT_STRINGS_METRIC_PATH);
    if (row == null) return metrics;
    val str = row.getStrings();
    ItemsSketch<String> sketch;
    if (str == null) {
      // null represents an empty frequent_strings sketch
      sketch = emptySketch();
    } else {
      final byte[] bytes = DruidStringUtils.decodeBase64(str.getBytes(StandardCharsets.UTF_8));
      sketch = deserialize(bytes);
    }
    val summary = mkSummary(sketch);

    metrics.remove(FREQUENT_STRINGS_METRIC_PATH);
    val newrow = new ColumnMetric(FREQUENT_STRINGS_METRIC_PATH, summary);
    metrics.put(newrow.getMetricPath(), newrow);
    return metrics;
  }

  Map<String, Object> mkSummary(ItemsSketch<String> sketch) {
    Map<String, Object> freq = new LinkedHashMap<>();
    List<Row<String>> sorted = Arrays.asList(sketch.getFrequentItems(ErrorType.NO_FALSE_NEGATIVES));
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

    Map<String, Object> summary = new HashMap<>();
    summary.put("items", freq);
    summary.put("numActive", sketch.getNumActiveItems());
    summary.put("mapCapacity", sketch.getCurrentMapCapacity());
    summary.put("maxError", sketch.getMaximumError());
    return summary;
  }
}
