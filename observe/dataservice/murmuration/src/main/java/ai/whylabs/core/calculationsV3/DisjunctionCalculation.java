package ai.whylabs.core.calculationsV3;

import ai.whylabs.core.aggregation.ChartMetadata;
import ai.whylabs.core.calculationsV3.results.CalculationResult;
import ai.whylabs.core.calculationsV3.results.DisjunctionCalculationResult;
import ai.whylabs.core.configV3.structure.Analyzer;
import ai.whylabs.core.configV3.structure.Analyzers.DisjunctionConfig;
import ai.whylabs.core.configV3.structure.MonitorConfigV3;
import ai.whylabs.core.structures.monitor.events.AnalyzerResult;
import java.util.List;
import java.util.function.Function;
import org.apache.commons.lang3.tuple.Pair;

public class DisjunctionCalculation<T> extends BaseCalculationV3<T, DisjunctionCalculationResult> {

  protected final DisjunctionConfig config;

  public DisjunctionCalculation(
      MonitorConfigV3 monitorConfigV3,
      Analyzer analyzer,
      boolean overwriteEvents,
      DisjunctionConfig config) {
    super(monitorConfigV3, analyzer, overwriteEvents);
    this.config = config;
  }

  @Override
  public Function<AnalyzerResult, CalculationResult> getPreviousResultTransformer() {
    return new Function<AnalyzerResult, CalculationResult>() {
      @Override
      public CalculationResult apply(AnalyzerResult analyzerResult) {
        return DisjunctionCalculationResult.builder()
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
    return DisjunctionCalculationResult.builder().alertCount(0l).build();
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
