package ai.whylabs.core.calculationsV3;

import ai.whylabs.core.aggregation.ChartMetadata;
import ai.whylabs.core.calculationsV3.results.CalculationResult;
import ai.whylabs.core.calculationsV3.results.FixedCalculationResult;
import ai.whylabs.core.configV3.structure.Analyzer;
import ai.whylabs.core.configV3.structure.Analyzers.FixedThresholdsConfig;
import ai.whylabs.core.configV3.structure.MonitorConfigV3;
import ai.whylabs.core.structures.monitor.events.AnalyzerResult;
import java.util.List;
import java.util.function.Function;
import lombok.NonNull;
import lombok.val;
import org.apache.commons.lang3.tuple.Pair;

public class FixedThresholdCalculationLong extends BaseCalculationV3<Long, FixedCalculationResult> {
  private FixedThresholdsConfig config;

  public FixedThresholdCalculationLong(
      MonitorConfigV3 monitorConfigV3,
      Analyzer analyzer,
      boolean overwriteEvents,
      @NonNull FixedThresholdsConfig config) {
    super(monitorConfigV3, analyzer, overwriteEvents);
    this.config = config;
  }

  @Override
  public FixedCalculationResult calculate(
      List<Pair<Long, Long>> _ignored,
      List<Pair<Long, Long>> target,
      List<Pair<Long, CalculationResult>> feedbackLoop) {

    val d = target.get(0).getValue();
    if (target.size() != 1 || target.get(0).getValue() == null) {
      return null;
    }
    long alertCount = evaluateThreshold(d);
    if (config.getNConsecutive() != null && alertCount > 0l) {
      val consecutiveFeedback =
          getNConsecutiveFromFeedbackLoop(feedbackLoop, config.getNConsecutive());
      for (val f : consecutiveFeedback) {
        if (evaluateThreshold(((FixedCalculationResult) f.getValue()).getValue().longValue())
            == 0) {
          alertCount = 0;
        }
      }
      if (consecutiveFeedback.size() < config.getNConsecutive() - 1) {
        alertCount = 0;
      }
    }
    val builder =
        FixedCalculationResult.builder()
            .value(new Double(d))
            .absoluteLower(config.getLower())
            .absoluteUpper(config.getUpper())
            .alertCount(alertCount);
    return builder.build();
  }

  private long evaluateThreshold(Long d) {
    long alertCount = 0;
    if (config.getLower() != null && d < config.getLower().longValue()) {
      alertCount = 1;
    }
    if (config.getUpper() != null && d > config.getUpper().longValue()) {
      alertCount = 1;
    }
    return alertCount;
  }

  @Override
  public boolean requireRollup() {
    if (config.getNConsecutive() != null && config.getNConsecutive() > 0) {
      return true;
    }
    return false;
  }

  @Override
  public Function<AnalyzerResult, CalculationResult> getPreviousResultTransformer() {
    return new Function<AnalyzerResult, CalculationResult>() {
      @Override
      public CalculationResult apply(AnalyzerResult analyzerResult) {
        return FixedCalculationResult.builder()
            .value(analyzerResult.getThreshold_metricValue())
            .alertCount(analyzerResult.getAnomalyCount())
            .absoluteUpper(analyzerResult.getThreshold_absoluteUpper())
            .absoluteLower(analyzerResult.getThreshold_absoluteLower())
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
