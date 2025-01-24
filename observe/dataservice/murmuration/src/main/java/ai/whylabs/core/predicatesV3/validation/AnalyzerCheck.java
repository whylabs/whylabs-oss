package ai.whylabs.core.predicatesV3.validation;

import ai.whylabs.core.configV3.structure.Analyzer;
import ai.whylabs.core.structures.monitor.events.FailureType;
import java.util.function.Predicate;
import lombok.Getter;

@Getter
public abstract class AnalyzerCheck implements Predicate<Analyzer> {
  protected FailureType failureType;
  protected String internalErrorMessage;
}
