package ai.whylabs.core.predicatesV3.validation;

import ai.whylabs.core.configV3.structure.Analyzer;
import ai.whylabs.core.configV3.structure.ImmediateSchedule;
import ai.whylabs.core.structures.monitor.events.FailureType;
import lombok.Getter;

@Getter
public class ValidAnalyzerSchedule extends AnalyzerCheck {
  @Override
  public boolean test(Analyzer analyzer) {
    // some implementations of Schedule interface are not applicable to Analyzers.
    if (analyzer.getSchedule() instanceof ImmediateSchedule) {
      failureType = FailureType.IncompatibleTypes;
      return false;
    }
    return true;
  }
}
