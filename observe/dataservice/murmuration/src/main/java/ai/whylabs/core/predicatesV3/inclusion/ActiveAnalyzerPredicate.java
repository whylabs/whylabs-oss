package ai.whylabs.core.predicatesV3.inclusion;

import ai.whylabs.core.configV3.structure.MonitorConfigV3;
import java.io.Serializable;
import java.util.function.Predicate;
import lombok.val;

/** Check all analyzers to see if any of them are active and match the schedule */
public class ActiveAnalyzerPredicate implements Predicate<MonitorConfigV3>, Serializable {

  @Override
  public boolean test(MonitorConfigV3 monitorConfigV3) {
    for (val a : monitorConfigV3.getAnalyzers()) {
      if ((a.getDisabled() == null || !a.getDisabled())) {
        return true;
      }
    }
    return false;
  }
}
