package ai.whylabs.dataservice.entitySchema;

public class DefaultMetricMetadata {
  public String name;
  public String label;
  public String builtinMetric; // cannot be AnalysisMetric because includes FrequentItems
}
