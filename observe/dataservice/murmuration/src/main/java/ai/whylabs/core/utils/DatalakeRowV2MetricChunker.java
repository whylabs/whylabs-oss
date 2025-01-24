package ai.whylabs.core.utils;

import ai.whylabs.core.structures.DatalakeRowV2Metric;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import lombok.val;

/**
 * We had a bug when individual profile ingestion is enabled where multiple individual profiles
 * would end up on the same deltalake row. This isn't crazy terrible, but we need to break them up
 * when reading into separate ExplodedRows so they can be monitored separately.
 */
public class DatalakeRowV2MetricChunker {

  public static List<List<DatalakeRowV2Metric>> getChunks(List<DatalakeRowV2Metric> metrics) {
    List<List<DatalakeRowV2Metric>> out = new ArrayList<>();
    Set<String> seen = new HashSet();
    List<DatalakeRowV2Metric> chunk = new ArrayList<>();
    for (val m : metrics) {
      if (seen.contains(m.getMetricPath())) {
        out.add(chunk);
        chunk = new ArrayList<>();
        seen.clear();
      } else {
        chunk.add(m);
        seen.add(m.getMetricPath());
      }
    }
    if (chunk.size() > 0) {
      out.add(chunk);
    }
    return out;
  }
}
