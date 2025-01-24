package ai.whylabs.core.calculationsV3;

import ai.whylabs.core.aggregation.ChartMetadata;
import ai.whylabs.core.calculationsV3.results.CalculationResult;
import ai.whylabs.core.calculationsV3.results.FixedCalculationResult;
import ai.whylabs.core.configV3.structure.Analyzer;
import ai.whylabs.core.configV3.structure.Analyzers.MonotonicCalculationConfig;
import ai.whylabs.core.configV3.structure.MonitorConfigV3;
import ai.whylabs.core.configV3.structure.enums.MonotonicDirection;
import ai.whylabs.core.structures.monitor.events.AnalyzerResult;
import java.util.List;
import java.util.TreeMap;
import java.util.function.Function;
import lombok.NonNull;
import lombok.val;
import org.apache.commons.lang3.tuple.Pair;

public class MonotonicCalculationLong extends BaseCalculationV3<Long, FixedCalculationResult> {
  private MonotonicCalculationConfig config;

  public MonotonicCalculationLong(
      MonitorConfigV3 monitorConfigV3,
      Analyzer analyzer,
      boolean overwriteEvents,
      @NonNull MonotonicCalculationConfig config) {
    super(monitorConfigV3, analyzer, overwriteEvents);
    this.config = config;
  }

  @Override
  public FixedCalculationResult calculate(
      List<Pair<Long, Long>> baseline,
      List<Pair<Long, Long>> target,
      List<Pair<Long, CalculationResult>> feedbackLoop) {

    // Get everything sorted in a single map
    TreeMap<Long, Long> baselineWithTarget = new TreeMap<>();
    for (val p : baseline) {
      baselineWithTarget.put(p.getKey(), p.getValue());
    }
    for (val p : target) {
      baselineWithTarget.put(p.getKey(), p.getValue());
    }
    Long monotonicIncrease = 0l;
    Long monotonicDecrease = 0l;
    Long left = null;

    for (val d : baselineWithTarget.entrySet()) {
      if (left != null) {
        if (d.getValue() < left) {
          monotonicDecrease++;
        } else if (d.getValue() > left) {
          monotonicIncrease++;
        }
      }
      left = d.getValue();
    }
    Long value = monotonicDecrease;
    if (config.getDirection().equals(MonotonicDirection.INCREASING)) {
      value = monotonicIncrease;
    }

    long alertCount = 0;
    if (config.getNumBuckets() != null && value >= config.getNumBuckets().longValue()) {
      alertCount = 1;
    }

    val builder =
        FixedCalculationResult.builder()
            .value(new Double(value))
            .absoluteUpper(new Double(config.getNumBuckets()))
            .alertCount(alertCount);

    return builder.build();
  }

  @Override
  public boolean requireRollup() {
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
            .build();
      }
    };
  }

  @Override
  public boolean renderAnomalyChart(
      ChartMetadata metadata, List<Pair<Long, CalculationResult>> results, String path) {
    return false;
  }

  public boolean rollupTarget() {
    return false;
  }

  public boolean enableFeedbackLoop() {
    return false;
  }

  public boolean enableFilteringAnomaiesFromTargetLookback() {
    return false;
  }
}
