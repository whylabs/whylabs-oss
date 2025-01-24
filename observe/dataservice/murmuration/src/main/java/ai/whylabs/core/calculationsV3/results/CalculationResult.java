package ai.whylabs.core.calculationsV3.results;

import ai.whylabs.core.structures.monitor.events.AnalyzerResult;

public interface CalculationResult {
  void populate(AnalyzerResult.AnalyzerResultBuilder builder);

  Long getAlertCount();

  // Not every implementation of CalculationResult supports replacement value.
  // These default method allow us to pretend they do.
  default Boolean getShouldReplace() {
    return null;
  }

  default Double getReplacementValue() {
    return null;
  }

  default Double getUpperThreshold() {
    return null;
  }

  default Double getAdjustedPrediction() {
    return null;
  }
}
