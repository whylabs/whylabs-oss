package ai.whylabs.batch.utils;

import ai.whylabs.core.aggregation.ChartMetadata;
import ai.whylabs.core.calculationsV3.BaseCalculationV3;
import ai.whylabs.core.calculationsV3.results.CalculationResult;
import ai.whylabs.core.calculationsV3.results.EqualityCalculationResult;
import ai.whylabs.core.configV3.structure.Analyzer;
import ai.whylabs.core.configV3.structure.Analyzers.ComparisonConfig;
import ai.whylabs.core.configV3.structure.MonitorConfigV3;
import ai.whylabs.core.structures.monitor.events.AnalyzerResult;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import lombok.Getter;
import org.apache.commons.lang3.tuple.Pair;

/** Mock calculation class for testing the feedback loop */
@Getter
public class MockCalculation extends BaseCalculationV3<String, EqualityCalculationResult> {
  private Long invocations = 0l;
  Map<Long, List<Pair<Long, CalculationResult>>> invocationPriorResults = new HashMap<>();

  public MockCalculation(
      MonitorConfigV3 monitorConfigV3,
      Analyzer analyzer,
      boolean overwriteEvents,
      ComparisonConfig config) {
    super(monitorConfigV3, analyzer, overwriteEvents);
  }

  public boolean enableFeedbackLoop() {
    return true;
  }

  @Override
  public EqualityCalculationResult calculate(
      List<Pair<Long, String>> baseline,
      List<Pair<Long, String>> target,
      List<Pair<Long, CalculationResult>> priorResults) {
    invocationPriorResults.put(invocations, priorResults);
    invocations++;

    // Each invoke has a higher alert count just to make it easy to assert on
    return EqualityCalculationResult.builder()
        // alert is raise if the compared values are not equal
        .alertCount(invocations)
        .build();
  }

  @Override
  public boolean requireRollup() {
    return true;
  }

  @Override
  public Function<AnalyzerResult, CalculationResult> getPreviousResultTransformer() {
    return new Function<AnalyzerResult, CalculationResult>() {
      @Override
      public CalculationResult apply(AnalyzerResult analyzerResult) {
        return EqualityCalculationResult.builder()
            .alertCount(analyzerResult.getAnomalyCount())
            .build();
      }
    };
  }

  @Override
  public boolean renderAnomalyChart(
      ChartMetadata metadata, List<Pair<Long, CalculationResult>> results, String path) {
    return false;
  }
}
