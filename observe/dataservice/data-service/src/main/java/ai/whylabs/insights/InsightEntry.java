package ai.whylabs.insights;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class InsightEntry {
  String name;
  String column;
  String description;
  String message;
  InsightMetricResult metrics;
}
