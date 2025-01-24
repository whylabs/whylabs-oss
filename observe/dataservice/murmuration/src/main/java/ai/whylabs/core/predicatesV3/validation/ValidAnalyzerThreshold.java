package ai.whylabs.core.predicatesV3.validation;

import ai.whylabs.core.configV3.structure.Analyzer;
import lombok.Getter;

@Getter
public class ValidAnalyzerThreshold extends AnalyzerCheck {
  @Override
  public boolean test(Analyzer analyzer) {
    // maxUpperThreshold/minLowerThreshold fields have been moved into the AnalyzerConfig.
    // Only SeasonalConfig and StddevConfig have maxUpperThreshold/minLowerThreshold fields
    /* TODO: Tests for each individual type of analyzer
    if (analyzer.getMaxUpper() != null
        && analyzer.getMinLower() != null
        && analyzer.getMinLower() > analyzer.getMaxUpper()) {
      failureType = FailureType.MinThresholdExceedsMaxThreshold;
      return false;
    }*/
    return true;
  }
}
