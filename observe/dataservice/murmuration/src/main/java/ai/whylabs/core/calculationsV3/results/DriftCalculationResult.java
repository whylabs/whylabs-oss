package ai.whylabs.core.calculationsV3.results;

import ai.whylabs.core.structures.monitor.events.AnalyzerResult;
import lombok.Builder;
import lombok.Data;

@Builder
@Data
public class DriftCalculationResult implements CalculationResult {
  private Double metricValue;
  private Double threshold;
  private Long alertCount;

  @Override
  public void populate(AnalyzerResult.AnalyzerResultBuilder builder) {
    builder.drift_metricValue(metricValue).drift_threshold(threshold).anomalyCount(alertCount);
  }
}
