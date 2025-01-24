package ai.whylabs.whylogsv1.util;

import java.util.HashMap;
import java.util.List;
import java.util.stream.Collectors;

// As the name says, just some simple application-level (not WhyLogs) metrics.
// At some point we should probably bring in a more comprehensive library, but
// this suffices for now.  Not thread safe.
public class SuperSimpleInternalMetrics {
  private HashMap<String, Integer> counts;

  static SuperSimpleInternalMetrics instance = null;

  public static SuperSimpleInternalMetrics METRICS() {
    if (instance == null) {
      instance = new SuperSimpleInternalMetrics();
    }

    return instance;
  }
  ;

  SuperSimpleInternalMetrics() {
    this.counts = new HashMap<>();
  }

  public void increment(String metricName) {
    int value = counts.getOrDefault(metricName, 0);

    counts.put(metricName, value + 1);
  }

  public void incrementBy(String metricName, int value) {
    int prevValue = counts.getOrDefault(metricName, 0);

    counts.put(metricName, prevValue + value);
  }

  public int getCount(String metricName) {
    return counts.getOrDefault(metricName, 0);
  }

  public String summarize() {
    StringBuilder sb = new StringBuilder();

    List<String> sorted = counts.keySet().stream().sorted().collect(Collectors.toList());

    for (String k : sorted) {
      sb.append(String.format("%-60s %5d\n", k, counts.get(k)));
    }

    return sb.toString();
  }

  @Override
  public String toString() {
    return "SuperSimpleMetrics{" + "counts=" + counts + '}';
  }
}
