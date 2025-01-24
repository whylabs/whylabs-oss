package ai.whylabs.core.predicatesV3.inclusion;

import ai.whylabs.core.configV3.structure.Analyzer;
import java.util.List;
import java.util.function.Predicate;
import lombok.val;

/**
 * If any of the analyzers specify individual we have an additional fanout to collect them without
 * being rolled up.
 */
public class IndividualProfileAnalyzerPredicate implements Predicate<List<Analyzer>> {

  @Override
  public boolean test(List<Analyzer> analyzerList) {
    if (analyzerList == null) {
      return false;
    }
    for (val a : analyzerList) {
      if (a.isDisableTargetRollup()) {
        return true;
      }
    }

    return false;
  }
}
