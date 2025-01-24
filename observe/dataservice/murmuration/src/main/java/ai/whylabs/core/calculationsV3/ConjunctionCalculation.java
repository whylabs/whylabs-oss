package ai.whylabs.core.calculationsV3;

import ai.whylabs.core.aggregation.ChartMetadata;
import ai.whylabs.core.calculationsV3.results.CalculationResult;
import ai.whylabs.core.calculationsV3.results.ConjunctionCalculationResult;
import ai.whylabs.core.configV3.structure.Analyzer;
import ai.whylabs.core.configV3.structure.Analyzers.ConjunctionConfig;
import ai.whylabs.core.configV3.structure.MonitorConfigV3;
import ai.whylabs.core.structures.monitor.events.AnalyzerResult;
import java.util.List;
import java.util.function.Function;
import org.apache.commons.lang3.tuple.Pair;

public class ConjunctionCalculation<T> extends BaseCalculationV3<T, ConjunctionCalculationResult> {

  public ConjunctionCalculation(
      MonitorConfigV3 monitorConfigV3,
      Analyzer analyzer,
      boolean overwriteEvents,
      ConjunctionConfig config) {
    super(monitorConfigV3, analyzer, overwriteEvents);
  }

  @Override
  public Function<AnalyzerResult, CalculationResult> getPreviousResultTransformer() {
    return new Function<AnalyzerResult, CalculationResult>() {
      @Override
      public CalculationResult apply(AnalyzerResult analyzerResult) {
        return ConjunctionCalculationResult.builder()
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

  @Override
  public CalculationResult calculate(
      List<Pair<Long, T>> baseline,
      List<Pair<Long, T>> target,
      List<Pair<Long, CalculationResult>> priorResults) {
    // This is a parent analyzer which gets calculate after a shuffle of the child analyzers in a
    // 2nd pass. This is just a placeholder.
    return ConjunctionCalculationResult.builder().alertCount(0l).build();
  }

  @Override
  public boolean requireRollup() {
    return false;
  }

  @Override
  public boolean parent() {
    return true;
  }
}
