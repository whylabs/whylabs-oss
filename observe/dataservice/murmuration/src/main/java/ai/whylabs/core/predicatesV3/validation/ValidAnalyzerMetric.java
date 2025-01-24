package ai.whylabs.core.predicatesV3.validation;

import ai.whylabs.core.configV3.structure.Analyzer;
import ai.whylabs.core.configV3.structure.enums.AnalysisMetric;
import ai.whylabs.core.structures.monitor.events.FailureType;
import lombok.Getter;

@Getter
public class ValidAnalyzerMetric extends AnalyzerCheck {

  @Override
  public boolean test(Analyzer analyzer) {
    try {
      if (analyzer.getConfig().parent()) {
        // Parent analyzers currently have null metrics
        return true;
      }
      AnalysisMetric.fromName(analyzer.getMetric());

    } catch (Exception e) {
      internalErrorMessage = e.toString();
      failureType = FailureType.UnknownMetric;
      return false;
    }

    return true;
  }
}
