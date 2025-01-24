package ai.whylabs.core.predicatesV3.validation;

import ai.whylabs.core.configV3.structure.MonitorConfigV3;
import ai.whylabs.core.structures.monitor.events.FailureType;
import java.util.function.Predicate;
import lombok.Getter;

@Getter
public abstract class MonitorConfigTopLevelCheck implements Predicate<MonitorConfigV3> {
  protected FailureType failureType;
  protected String internalErrorMessage;
}
