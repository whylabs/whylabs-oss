package ai.whylabs.core.predicatesV3.inclusion;

import ai.whylabs.core.configV3.structure.Monitor;
import ai.whylabs.core.structures.monitor.events.AnalyzerResult;
import java.util.function.BiPredicate;
import lombok.val;

public class AnomalyFilterPredicate implements BiPredicate<Monitor, AnalyzerResult> {

  @Override
  public boolean test(Monitor monitor, AnalyzerResult analyzerResult) {
    val filter = monitor.getMode().getAnomalyFilter();
    if (filter == null) {
      return true;
    }

    if (filter.getIncludeColumns() != null
        && !filter.getIncludeColumns().contains(analyzerResult.getColumn())) {
      return false;
    }

    if (filter.getExcludeColumns() != null
        && filter.getExcludeColumns().contains(analyzerResult.getColumn())) {
      return false;
    }

    if (filter.getIncludeMetrics() != null
        && !filter.getIncludeMetrics().contains(analyzerResult.getMetric())) {
      return false;
    }
    if (filter.getMinWeight() != null
        && (analyzerResult.getSegmentWeight() == null
            || filter.getMinWeight() > analyzerResult.getSegmentWeight())) {
      return false;
    }

    if (filter.getMaxWeight() != null
        && analyzerResult.getSegmentWeight() != null
        && filter.getMaxWeight() < analyzerResult.getSegmentWeight()) {
      return false;
    }

    return true;
  }
}
