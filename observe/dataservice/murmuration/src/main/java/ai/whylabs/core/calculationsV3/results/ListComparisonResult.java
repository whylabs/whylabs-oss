package ai.whylabs.core.calculationsV3.results;

import ai.whylabs.core.structures.monitor.events.AnalyzerResult;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ListComparisonResult implements CalculationResult {
  private Long alertCount;
  private String observed;

  @Override
  public void populate(AnalyzerResult.AnalyzerResultBuilder builder) {
    builder.anomalyCount(alertCount).comparison_observed(observed);
  }
}
