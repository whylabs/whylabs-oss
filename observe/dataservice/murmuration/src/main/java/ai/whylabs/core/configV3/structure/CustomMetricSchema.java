package ai.whylabs.core.configV3.structure;

import lombok.*;

@Builder
@Data
@AllArgsConstructor
@NoArgsConstructor
@EqualsAndHashCode
public class CustomMetricSchema {
  private String label;
  private String column;
  private String builtinMetric; // expected to be in AnalysisMetric enum
}
