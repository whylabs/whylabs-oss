package ai.whylabs.core.calculationsV3.results;

import ai.whylabs.core.structures.monitor.events.AnalyzerResult;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Builder
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DisjunctionCalculationResult extends BaseCompositeCalculationResult
    implements CalculationResult {

  private Long alertCount;

  @Override
  public void populate(AnalyzerResult.AnalyzerResultBuilder builder) {
    builder.anomalyCount(alertCount);
  }

  @Override
  public void mergeFamily(AnalyzerResult parent, List<AnalyzerResult> children) {
    long childAnomalyCount = super.merge(parent, children);

    if (childAnomalyCount > 0) {
      parent.setAnomalyCount(1l);
    } else {
      parent.setAnomalyCount(0l);
    }
  }
}
