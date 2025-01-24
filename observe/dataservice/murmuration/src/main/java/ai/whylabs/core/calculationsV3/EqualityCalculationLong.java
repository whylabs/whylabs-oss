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
public class EqualityCalculationLong extends BaseCalculationV3<Long, EqualityCalculationResult> {
  @NonNull private final ComparisonConfig config;

  public EqualityCalculationLong(
      MonitorConfigV3 monitorConfigV3,
      Analyzer analyzer,
      boolean overwriteEvents,
      @NonNull ComparisonConfig config) {
    super(monitorConfigV3, analyzer, overwriteEvents);
    this.config = config;
  }

  public static Long fromExpectedValue(ExpectedValue expected, String metric) {
    Long expectedValue = null;
    if (expected != null) {
      if (expected.getIntValue() != null) {
        expectedValue = Long.valueOf(expected.getIntValue());
      } else {
        throw new IllegalArgumentException(
            "ComparisonConfig config expected Integer value when comparing to numeric metric "
                + metric);
      }
    }
    return expectedValue;
  }

  @Override
  public EqualityCalculationResult calculate(
      List<Pair<Long, Long>> baseline,
      List<Pair<Long, Long>> target,
      List<Pair<Long, CalculationResult>> priorResults) {

    // EqualityCalculation supports two behaviors.  If a value is supplied in
    // `config.ExpectedValue`, then the calculation compares target metric value against the
    // supplied expected value; the baseline is ignored. If an expected value is NOT supplied, the
    // target metric value is compared against the metric value from the rolled up baseline.  In
    // either case, an alert is raise if the compared values are not equal.
    Long expectedValue = fromExpectedValue(config.getExpected(), config.getMetric());

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
        .expected(expectedValue.toString())
        .observed(observedValue.toString())
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
