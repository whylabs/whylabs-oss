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
import org.apache.commons.lang3.tuple.Pair;

@Slf4j
public class EqualityCalculationDouble
    extends BaseCalculationV3<Double, EqualityCalculationResult> {
  @NonNull private final ComparisonConfig config;

  public EqualityCalculationDouble(
      MonitorConfigV3 monitorConfigV3,
      Analyzer analyzer,
      boolean overwriteEvents,
      @NonNull ComparisonConfig config) {
    super(monitorConfigV3, analyzer, overwriteEvents);
    this.config = config;
  }

  public static Double fromExpectedValue(ExpectedValue expected, String metric) {
    Double expectedValue = null;
    if (expected != null) {
      if (expected.getFloatValue() != null) {
        expectedValue = expected.getFloatValue();
      } else if (expected.getIntValue() != null) {
        expectedValue = Double.valueOf(expected.getIntValue());
      } else if (expected.getStringValue() != null) {
        try {
          expectedValue = Double.valueOf(expected.getStringValue());
        } catch (NumberFormatException e) {
          throw new IllegalArgumentException(
              String.format(
                  "Comparison analyzer cannot compare \"%s\" to numeric metric \"%s\"",
                  expected.getStringValue(), metric),
              e);
        }
      } else {
        throw new IllegalArgumentException("Comparison config expected Float value");
      }
    }
    return expectedValue;
  }

  @Override
  public EqualityCalculationResult calculate(
      List<Pair<Long, Double>> baseline,
      List<Pair<Long, Double>> target,
      List<Pair<Long, CalculationResult>> priorResults) {

    // EqualityCalculation supports two behaviors.  If a value is supplied in
    // `config.ExpectedValue`, then the calculation compares target metric value against the
    // supplied expected value; the baseline is ignored. If an expected value is NOT supplied, the
    // target metric value is compared against the metric value from the rolled up baseline.  In
    // either case, an alert is raise if the compared values are not equal.
    Double expectedValue = fromExpectedValue(config.getExpected(), config.getMetric());

    Double observedValue = target.get(0).getValue();
    boolean isEqual;
    if (expectedValue == null) {
      // without expected value, compare target to rolled-up baseline.
      if (baseline.size() != 1) {
        throw new RuntimeException("EqualityCalculation expected rolled up baseline");
      }
      expectedValue = baseline.get(0).getValue();
    }

    if (Double.isNaN(observedValue)) {
      isEqual = Double.isNaN(expectedValue);
    } else {
      isEqual = (Math.abs(expectedValue - observedValue) <= Math.ulp(expectedValue));
    }

    // NOTE: calculation result only deals in string values
    return EqualityCalculationResult.builder()
        .alertCount(isEqual ? 0L : 1L)
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
