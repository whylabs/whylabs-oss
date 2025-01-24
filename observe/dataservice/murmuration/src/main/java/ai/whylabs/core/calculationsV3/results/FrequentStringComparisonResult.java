package ai.whylabs.core.calculationsV3.results;

import ai.whylabs.core.configV3.structure.Analyzers.FrequentStringComparisonOperator;
import ai.whylabs.core.structures.monitor.events.AnalyzerResult;
import java.util.List;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class FrequentStringComparisonResult implements CalculationResult {
  private Long alertCount;
  private FrequentStringComparisonOperator operator;

  private List<String> sample;
  private List<Long[]> sampleCounts;

  @Override
  public void populate(AnalyzerResult.AnalyzerResultBuilder builder) {
    builder
        .anomalyCount(alertCount)
        .frequentStringComparison_operator(operator)
        .frequentStringComparison_sample(sample)
        .freqStringCount(sampleCounts);
  }
}
