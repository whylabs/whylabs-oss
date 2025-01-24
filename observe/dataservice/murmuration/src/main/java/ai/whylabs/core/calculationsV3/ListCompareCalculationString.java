package ai.whylabs.core.calculationsV3;

import ai.whylabs.core.aggregation.ChartMetadata;
import ai.whylabs.core.calculationsV3.results.CalculationResult;
import ai.whylabs.core.calculationsV3.results.ListComparisonResult;
import ai.whylabs.core.configV3.structure.Analyzer;
import ai.whylabs.core.configV3.structure.Analyzers.ListComparisonConfig;
import ai.whylabs.core.configV3.structure.MonitorConfigV3;
import ai.whylabs.core.structures.monitor.events.AnalyzerResult;
import java.util.ArrayList;
import java.util.List;
import java.util.function.Function;
import lombok.NonNull;
import lombok.val;
import org.apache.commons.lang3.NotImplementedException;
import org.apache.commons.lang3.tuple.Pair;

public class ListCompareCalculationString extends BaseCalculationV3<String, ListComparisonResult> {
  @NonNull private final ListComparisonConfig config;

  public ListCompareCalculationString(
      MonitorConfigV3 monitorConfigV3,
      Analyzer analyzer,
      boolean overwriteEvents,
      @NonNull ListComparisonConfig config) {
    super(monitorConfigV3, analyzer, overwriteEvents);
    this.config = config;
  }

  @Override
  public ListComparisonResult calculate(
      List<Pair<Long, String>> baseline,
      List<Pair<Long, String>> target,
      List<Pair<Long, CalculationResult>> priorResults) {

    List<String> expectedValues = new ArrayList<>();
    if (config.getExpected() != null) {
      for (val e : config.getExpected()) {
        expectedValues.add(EqualityCalculationString.fromExpectedValue(e, config.getMetric()));
      }
    }

    String observedValue = target.get(0).getValue();
    if (expectedValues.size() == 0) {
      for (val b : baseline) {
        expectedValues.add(b.getValue());
      }
    }

    long alerting = 0l;
    switch (config.getOperator()) {
      case in:
        alerting = expectedValues.contains(observedValue) ? 0 : 1;
        break;
      case not_in:
        alerting = expectedValues.contains(observedValue) ? 1 : 0;
        break;
      default:
        throw new NotImplementedException(
            "Unknown ListComparisonConfig operator " + config.getOperator());
    }

    // NOTE: calculation result only deals in string values
    return ListComparisonResult.builder().alertCount(alerting).observed(observedValue).build();
  }

  @Override
  public boolean requireRollup() {
    return (getAnalyzer().getBaseline() != null);
  }

  @Override
  public Function<AnalyzerResult, CalculationResult> getPreviousResultTransformer() {
    return new Function<AnalyzerResult, CalculationResult>() {
      @Override
      public CalculationResult apply(AnalyzerResult analyzerResult) {
        return ListComparisonResult.builder()
            .alertCount(analyzerResult.getAnomalyCount())
            .observed(analyzerResult.getComparison_observed())
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
