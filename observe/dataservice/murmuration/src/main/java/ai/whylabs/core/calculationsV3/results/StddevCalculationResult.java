package ai.whylabs.core.calculationsV3.results;

import ai.whylabs.core.structures.monitor.events.AnalyzerResult;
import lombok.Builder;
import lombok.Data;

@Builder
@Data
public class StddevCalculationResult implements CalculationResult {
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
  private Double factor;
  private Integer numBatchSize;

  @Override
  public void populate(AnalyzerResult.AnalyzerResultBuilder builder) {
    builder
        .threshold_calculatedUpper(upperThreshold)
        .threshold_calculatedLower(lowerThreshold)
        .threshold_absoluteUpper(absoluteUpper)
        .threshold_absoluteLower(absoluteLower)
        .threshold_metricValue(value)
        .threshold_factor(factor)
        .threshold_minBatchSize(numBatchSize)
        .anomalyCount(alertCount)
        .seasonal_shouldReplace(shouldReplace)
        .seasonal_adjusted_prediction(adjustedPrediction)
        .seasonal_replacement(replacementValue)
        .seasonal_lambdaKeep(lambdaKeep);
  }
}
