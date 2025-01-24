package ai.whylabs.core.calculationsV3.results;

import ai.whylabs.core.structures.monitor.events.AnalyzerResult;
import lombok.Builder;
import lombok.Data;

@Builder
@Data
public class SeasonalResult implements CalculationResult {

  private Double upperThreshold;
  private Double lowerThreshold;
  private Double absoluteUpper;
  private Double absoluteLower;
  private Long alertCount;
  private Double value;
  private Boolean shouldReplace;
  private Double replacementValue;
  private Double adjustedPrediction;
  private Double lambdaKeep;

  @Override
  public void populate(AnalyzerResult.AnalyzerResultBuilder builder) {
    builder
        .threshold_calculatedUpper(upperThreshold)
        .threshold_calculatedLower(lowerThreshold)
        .threshold_absoluteUpper(absoluteUpper)
        .threshold_absoluteLower(absoluteLower)
        .threshold_metricValue(value)
        .anomalyCount(alertCount)
        .seasonal_shouldReplace(shouldReplace)
        .seasonal_adjusted_prediction(adjustedPrediction)
        .seasonal_replacement(replacementValue)
        .seasonal_lambdaKeep(lambdaKeep);
  }
}
