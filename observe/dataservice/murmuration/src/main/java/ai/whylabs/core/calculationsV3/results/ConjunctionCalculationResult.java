package ai.whylabs.core.calculationsV3.results;

import ai.whylabs.core.structures.monitor.events.AnalyzerResult;
import ai.whylabs.core.structures.monitor.events.FailureType;
import java.util.List;
import lombok.*;

@Builder
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ConjunctionCalculationResult extends BaseCompositeCalculationResult
    implements CalculationResult {

  private Long alertCount;

  @Override
  public void populate(AnalyzerResult.AnalyzerResultBuilder builder) {
    builder.anomalyCount(alertCount);
  }

  @Override
  public void mergeFamily(AnalyzerResult parent, List<AnalyzerResult> children) {
    long childAnomalyCount = super.merge(parent, children);

    if (parent.getChildAnalyzerIds().size() > parent.getChildAnalysisIds().size()) {
      parent.setFailureType(FailureType.CompositeCalculationMissingColumns);
      parent.setAnomalyCount(0l);
    } else if (parent.getChildAnalyzerIds().size() == childAnomalyCount) {
      parent.setAnomalyCount(1l);
    } else {
      parent.setAnomalyCount(0l);
    }
  }
}
