package ai.whylabs.core.calculationsV3.results;

import ai.whylabs.core.structures.monitor.events.AnalyzerResult;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.val;

public abstract class BaseCompositeCalculationResult {
  protected long merge(AnalyzerResult parent, List<AnalyzerResult> children) {
    List<String> analysisIds = new ArrayList<>();
    Set<String> traceIds = new HashSet<>();
    Long anomalyCount = 0l;
    for (val child : children) {
      analysisIds.add(child.getAnalysisId());
      if (child.getTraceIds() != null) {
        traceIds.addAll(child.getTraceIds());
      }
      anomalyCount += child.getAnomalyCount();
    }
    parent.setTraceIds(traceIds.stream().collect(Collectors.toList()));
    parent.setChildAnalysisIds(analysisIds);
    return anomalyCount;
  }

  public abstract void mergeFamily(AnalyzerResult parent, List<AnalyzerResult> children);
}
