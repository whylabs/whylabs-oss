package ai.whylabs.core.calculationsV3;

import ai.whylabs.core.aggregation.ChartMetadata;
import ai.whylabs.core.calculationsV3.results.CalculationResult;
import ai.whylabs.core.calculationsV3.results.EqualityCalculationResult;
import ai.whylabs.core.configV3.structure.Analyzer;
import ai.whylabs.core.configV3.structure.Analyzers.ComparisonConfig;
import ai.whylabs.core.configV3.structure.Analyzers.ExpectedValue;
import ai.whylabs.core.configV3.structure.MonitorConfigV3;
import ai.whylabs.core.structures.monitor.events.AnalyzerResult;
import java.util.List;
import java.util.function.Function;
import lombok.NonNull;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import org.apache.commons.lang3.tuple.Pair;

@Slf4j
public class EqualityCalculationString
    extends BaseCalculationV3<String, EqualityCalculationResult> {
  @NonNull private final ComparisonConfig config;

  public EqualityCalculationString(
      MonitorConfigV3 monitorConfigV3,
      Analyzer analyzer,
      boolean overwriteEvents,
      @NonNull ComparisonConfig config) {
    super(monitorConfigV3, analyzer, overwriteEvents);
    this.config = config;
  }

  public static String fromExpectedValue(ExpectedValue expected, String metric) {
    if (expected == null) {
      return null;
    }

    if (expected.getStringValue() != null) {
      return expected.getStringValue();
    } else if (expected.getIntValue() != null) {
      return expected.getIntValue().toString();
    } else {
      throw new IllegalArgumentException(
          "ComparisonConfig config expected String value for metric " + metric);
    }
  }

  @Override
  public EqualityCalculationResult calculate(
      List<Pair<Long, String>> baseline,
      List<Pair<Long, String>> target,
      List<Pair<Long, CalculationResult>> priorResults) {

    // EqualityCalculation supports two behaviors.  If a value is supplied in
    // `config.ExpectedValue`, then the calculation compares target metric value against the
    // supplied expected value; the baseline is ignored. If an expected value is NOT supplied, the
    // target metric value is compared against the metric value from the rolled up baseline.  In
    // either case, an alert is raise if the compared values are not equal.
    String expectedValue = fromExpectedValue(config.getExpected(), config.getMetric());

    if (expectedValue == null) {
      // without expected value, compare target to rolled-up baseline.
      if (baseline.size() != 1) {
        throw new RuntimeException("EqualityCalculation expected rolled up baseline");
      }
      expectedValue = baseline.get(0).getValue();
    }
    val observedValue = target.get(0).getValue();

    // NOTE: calculation result only deals in string values
    return EqualityCalculationResult.builder()
        .alertCount(expectedValue.equals(observedValue) ? 0L : 1L)
        .expected(expectedValue)
        .observed(observedValue)
        .build();
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
        return EqualityCalculationResult.builder()
            .alertCount(analyzerResult.getAnomalyCount())
            .expected(analyzerResult.getComparison_expected())
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
