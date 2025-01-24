package ai.whylabs.core.calculationsV3.results;

import ai.whylabs.core.configV3.structure.Analyzers.DiffMode;
import ai.whylabs.core.configV3.structure.Analyzers.ThresholdType;
import ai.whylabs.core.structures.monitor.events.AnalyzerResult;
import lombok.Builder;
import lombok.Data;

@Builder
@Data
public class DiffCalculationResult implements CalculationResult {
  private DiffMode mode;
  private Double threshold;
  private Double diff;
  private Double targetValue;
  private Double upper;
  private Double lower;
  private Long alertCount;
  private ThresholdType thresholdType;

  @Override
  public void populate(AnalyzerResult.AnalyzerResultBuilder builder) {
    builder
        .diff_metricValue(diff)
        .diff_threshold(threshold)
        .threshold_metricValue(targetValue)
        .threshold_calculatedLower(lower)
        .threshold_calculatedUpper(upper)
        .diff_mode(mode)
        .anomalyCount(alertCount)
        .threshold_type(thresholdType);
  }
}
