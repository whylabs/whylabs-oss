package ai.whylabs.core.calculationsV3;

import ai.whylabs.core.aggregation.ChartMetadata;
import ai.whylabs.core.calculationsV3.results.CalculationResult;
import ai.whylabs.core.calculationsV3.results.DiffCalculationResult;
import ai.whylabs.core.configV3.structure.Analyzer;
import ai.whylabs.core.configV3.structure.Analyzers.DiffConfig;
import ai.whylabs.core.configV3.structure.Analyzers.ThresholdType;
import ai.whylabs.core.configV3.structure.MonitorConfigV3;
import ai.whylabs.core.structures.monitor.events.AnalyzerResult;
import java.util.List;
import java.util.function.Function;
import lombok.val;
import org.apache.commons.lang3.tuple.Pair;

/*
 * This monitor detects the difference between the target's metric and the baseline metric.
 * Both of these metrics MUST be in rolled up form
 */
public class DiffCalculation extends BaseCalculationV3<Double, DiffCalculationResult> {
  private final DiffConfig config;

  public DiffCalculation(
      MonitorConfigV3 monitorConfigV3,
      Analyzer analyzer,
      boolean overwriteEvents,
      DiffConfig config) {
    super(monitorConfigV3, analyzer, overwriteEvents);
    this.config = config;
  }

  @Override
  public DiffCalculationResult calculate(
      List<Pair<Long, Double>> baseline,
      List<Pair<Long, Double>> target,
      List<Pair<Long, CalculationResult>> priorResults) {

    // Both of these metrics MUST be in rolled up form
    if (baseline.size() != 1) {
      throw new IllegalArgumentException(
          "DiffCalculation expected rolled-up baseline to have length 1");
    }
    if (target.size() != 1) {
      throw new IllegalArgumentException(
          "DiffCalculation expected rolled-up target to have length 1");
    }
    if (config.getThreshold() < 0) {
      throw new IllegalArgumentException("DiffCalculation expected threshold >= 0");
    }
    if (config.getMode() == null) {
      throw new IllegalArgumentException("diff config needs a mode");
    }
    if (baseline.get(0).getValue() == null || target.get(0).getValue() == null) {
      throw new IllegalArgumentException("DiffCalculation expected non-null values");
    }
    double diff = Math.abs(baseline.get(0).getValue() - target.get(0).getValue());
    Double lower = null;
    Double upper = null;
    switch (config.getMode()) {
      case pct:
        // convert absolute diff to percentage difference
        // checking for zero divisor to avoid generating NaN.
        if (baseline.get(0).getValue() != 0.0) {
          diff = (diff / Math.abs(baseline.get(0).getValue())) * 100.0;
        } else {
          diff = (diff == 0.0 ? 0.0 : 1.0) * 100.0;
        }
        val d = baseline.get(0).getValue() * (config.getThreshold() / 100.0);
        lower = baseline.get(0).getValue() - d;
        upper = baseline.get(0).getValue() + d;
        break;

      case abs:
        lower = baseline.get(0).getValue() - config.getThreshold();
        upper = baseline.get(0).getValue() + config.getThreshold();
        break;
      default:
        throw new IllegalArgumentException(
            String.format("unrecognized diff config mode \"%s\"", config.getMode().toString()));
    }

    long alertCount = diff > config.getThreshold() ? 1L : 0L;

    // If a specific direction is specified suppress alerts if the diff is in the other direction
    if (config.getThresholdType() == ThresholdType.upper) {
      lower = null;
      if (target.get(0).getValue() < baseline.get(0).getValue()) alertCount = 0;
    }
    if (config.getThresholdType() == ThresholdType.lower) {
      upper = null;
      if (target.get(0).getValue() > baseline.get(0).getValue()) alertCount = 0;
    }

    val builder =
        DiffCalculationResult.builder()
            .diff(diff)
            .targetValue(target.get(0).getValue())
            .threshold(config.getThreshold())
            .mode(config.getMode())
            .lower(lower)
            .upper(upper)
            .thresholdType(config.getThresholdType())
            .alertCount(alertCount);
    return builder.build();
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
        return DiffCalculationResult.builder()
            .diff(analyzerResult.getDiff_metricValue())
            .alertCount(analyzerResult.getAnomalyCount())
            .mode(analyzerResult.getDiff_mode())
            .targetValue(analyzerResult.getThreshold_metricValue())
            .lower(analyzerResult.getThreshold_calculatedLower())
            .upper(analyzerResult.getThreshold_calculatedUpper())
            .thresholdType(analyzerResult.getThreshold_type())
            .threshold(analyzerResult.getDiff_threshold())
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
