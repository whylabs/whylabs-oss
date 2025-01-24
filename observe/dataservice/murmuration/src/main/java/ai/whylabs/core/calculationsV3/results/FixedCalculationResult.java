package ai.whylabs.core.calculationsV3.results;

import ai.whylabs.core.configV3.structure.Analyzers.ThresholdType;
import ai.whylabs.core.structures.monitor.events.AnalyzerResult;
import lombok.Builder;
import lombok.Data;

@Builder
@Data
public class FixedCalculationResult implements CalculationResult {
  private Double value;
  private Long alertCount;
  private Double absoluteUpper;
  private Double absoluteLower;
  private ThresholdType thresholdType;

  @Override
  public void populate(AnalyzerResult.AnalyzerResultBuilder builder) {
    builder
        .threshold_metricValue(value)
        .threshold_absoluteUpper(absoluteUpper)
        .threshold_absoluteLower(absoluteLower)
        .threshold_type(thresholdType)
        .anomalyCount(alertCount);
  }
}
