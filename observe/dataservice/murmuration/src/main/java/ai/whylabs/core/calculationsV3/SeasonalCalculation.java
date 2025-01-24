package ai.whylabs.core.calculationsV3;

import static java.lang.StrictMath.max;
import static java.lang.StrictMath.min;
import static java.util.Map.Entry.*;
import static java.util.Objects.isNull;

import ai.whylabs.core.aggregation.ChartMetadata;
import ai.whylabs.core.calculationsV3.results.CalculationResult;
import ai.whylabs.core.calculationsV3.results.SeasonalResult;
import ai.whylabs.core.configV3.structure.Analyzer;
import ai.whylabs.core.configV3.structure.Analyzers.SeasonalAlgorithm;
import ai.whylabs.core.configV3.structure.Analyzers.SeasonalConfig;
import ai.whylabs.core.configV3.structure.Analyzers.ThresholdType;
import ai.whylabs.core.configV3.structure.MonitorConfigV3;
import ai.whylabs.core.configV3.structure.TimeRange;
import ai.whylabs.core.structures.monitor.events.AnalyzerResult;
import ai.whylabs.py.*;
import java.util.Arrays;
import java.util.Date;
import java.util.List;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.NonNull;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import org.apache.commons.lang.NotImplementedException;
import org.apache.commons.lang3.tuple.Pair;

/**
 * Calculates upper bounds and lower bounds based on stddev from a series of numbers.
 *
 * <p>An analyzer using stddev for a window of time range.
 *
 * <p>This calculation will fall back to Poisson distribution if there is only 1 value in the
 * baseline
 */
@Slf4j
public class SeasonalCalculation extends BaseCalculationV3<Double, SeasonalResult> {
  private static final int SEASONALITY = 7;

  private final SeasonalConfig config;
  private final PyArimaInput pyArimaInput;
  private final Boolean enableChart;

  public SeasonalCalculation(
      MonitorConfigV3 monitorConfigV3,
      Analyzer analyzer,
      boolean overwriteEvents,
      @NonNull SeasonalConfig config) {
    super(monitorConfigV3, analyzer, overwriteEvents);
    this.config = config;

    // By default, our seasonal calculation uses these parameters.
    // They can be overridden in the config.
    // TODO: store this at model/org level.
    //  param derived from auto.arima in R
    //   ARIMA(1,0,0)(2,1,0)[7]
    // spotless:off
    val builder = PyArimaInput.builder().p(1).d(0).q(0).seasonal_P(2).seasonal_D(1).seasonal_Q(0).m(7)
        .alpha(config.getAlpha())  // 0.95 confidence interval
        .stddevFactor(config.getStddevFactor()).stddevMaxBatchSize(config.getStddevMaxBatchSize());
    // spotless:on

    // Monitor config can override Arima parameters
    val params = config.getParams();
    for (val e : params.entrySet()) {
      switch (e.getKey()) {
        case "p":
          builder.p(Integer.parseInt(e.getValue()));
          break;
        case "d":
          builder.d(Integer.parseInt(e.getValue()));
          break;
        case "q":
          builder.q(Integer.parseInt(e.getValue()));
          break;
        case "P":
          builder.seasonal_P(Integer.parseInt(e.getValue()));
          break;
        case "D":
          builder.seasonal_D(Integer.parseInt(e.getValue()));
          break;
        case "Q":
          builder.seasonal_Q(Integer.parseInt(e.getValue()));
          break;
        case "m":
          builder.m(Integer.parseInt(e.getValue()));
        case "alpha":
          builder.alpha(Double.parseDouble(e.getValue()));
      }
    }
    this.pyArimaInput = builder.build();
    this.enableChart = Boolean.valueOf(params.get("enableAnomalyCharts"));
  }

  /**
   * Convert TimeRange to string format expected by python ARIMA implementation. See
   * starling/pmdarima_func.py
   *
   * @param t TimeRange interval
   * @return
   */
  static String toEvent(TimeRange t) {
    return String.format(
        "%1$tY-%1$tm-%1$td:%2$tY-%2$tm-%2$td", new Date(t.getGte()), new Date(t.getLt()));
  }

  public boolean enableFeedbackLoop() {
    return true;
  }

  @Override
  public SeasonalResult calculate(
      List<Pair<Long, Double>> baseline,
      List<Pair<Long, Double>> target,
      @NonNull List<Pair<Long, CalculationResult>> priorResults) {

    // discard incomplete prior results
    final List<Pair<Long, CalculationResult>> priors =
        priorResults.stream()
            .filter(p -> !isNull(p.getRight().getShouldReplace()))
            .collect(Collectors.toList());

    // we only support arima right now.
    if (!config.getAlgorithm().equals(SeasonalAlgorithm.arima)) {
      throw new NotImplementedException(
          String.format("Seasonal algorithm \"%s\"", config.getAlgorithm().name()));
    }

    val values = new Double[baseline.size()];
    val timestamps = new long[baseline.size()];
    long baselineCount = 0;
    for (int x = 0; x < baseline.size(); x++) {
      val row = baseline.get(x);
      values[x] = row.getValue();
      timestamps[x] = row.getKey();
      if (values[x] != null) {
        baselineCount++;
      }
    }

    val minBatchSize = Optional.ofNullable(config.getMinBatchSize()).orElse(1);
    if (baselineCount < minBatchSize) {
      throw new RuntimeException(
          String.format("Calculation requires at least %d datapoints", minBatchSize));
    }
    if (config.getMinLowerThreshold() > config.getMaxUpperThreshold()) {
      throw new RuntimeException(
          String.format(
              "This config has min threshold of %f > max threshold of %f",
              config.getMinLowerThreshold(), config.getMaxUpperThreshold()));
    }

    val eventPeriods =
        config.getStddevTimeRanges().stream()
            .map(SeasonalCalculation::toEvent)
            .collect(Collectors.toList());

    val input =
        pyArimaInput //
            .toBuilder()
            .priors(priors)
            .actual(target.get(0).getValue())
            .values(
                Arrays.stream(values).map(d -> isNull(d) ? Double.NaN : d).toArray(Double[]::new))
            .timestamps(timestamps)
            .eventPeriods(eventPeriods);
    final ArimaOutput output = PyArimaFunctionV2.INSTANCE.apply(input.build());
    val targetValue = target.get(0).getValue();
    val builder = SeasonalResult.builder();
    if (output != null) {
      double upper = output.getUpper();
      double lower = output.getLower();

      // clamp calculated values to threshold overrides.
      upper = min(config.getMaxUpperThreshold(), max(upper, config.getMinLowerThreshold()));
      lower = max(config.getMinLowerThreshold(), min(lower, config.getMaxUpperThreshold()));

      // If a direction is specified, alert on only one threshold
      boolean alerted;
      final Double v = target.get(0).getValue();
      if (config.getThresholdType() == ThresholdType.upper) {
        alerted = targetValue > upper;
      } else if (config.getThresholdType() == ThresholdType.lower) {
        alerted = targetValue < lower;
      } else {
        alerted = targetValue < lower || targetValue > upper;
      }

      // NB: don't use output.alertCount because python does not consider
      // minLowerThreshold/maxUpperThreshold
      builder
          .value(targetValue) //
          .upperThreshold(upper) //
          .lowerThreshold(lower)
          .absoluteUpper(config.getMaxUpperThreshold())
          .absoluteLower(config.getMinLowerThreshold())
          .replacementValue(output.getReplacement())
          .alertCount(alerted ? 1L : 0L)
          .shouldReplace(output.isShouldReplace())
          .adjustedPrediction(output.getAdjustedPrediction())
          .lambdaKeep(output.getLambdaKeep());
    }
    return builder.build();
  }

  @Override
  public boolean requireRollup() {
    return false;
  }

  @Override
  public Function<AnalyzerResult, CalculationResult> getPreviousResultTransformer() {
    return analyzerResult ->
        SeasonalResult.builder()
            .value(analyzerResult.getThreshold_metricValue())
            .lowerThreshold(analyzerResult.getThreshold_calculatedLower())
            .upperThreshold(analyzerResult.getThreshold_calculatedUpper())
            .absoluteLower(analyzerResult.getThreshold_absoluteLower())
            .absoluteUpper(analyzerResult.getThreshold_absoluteUpper())
            .alertCount(analyzerResult.getAnomalyCount())
            .shouldReplace(analyzerResult.getSeasonal_shouldReplace())
            .lambdaKeep(analyzerResult.getSeasonal_lambdaKeep())
            .replacementValue(analyzerResult.getSeasonal_replacement())
            .adjustedPrediction(analyzerResult.getSeasonal_adjusted_prediction())
            .build();
  }

  @Override
  public boolean renderAnomalyChart(
      ChartMetadata metadata, List<Pair<Long, CalculationResult>> results, String path) {
    if (!this.enableChart) {
      return false;
    }

    // prior results are not ordered - sort by timestamp before plotting.
    results.sort(comparingByKey());

    // limit chart baseline to 14 days
    results = results.subList(Math.max(0, results.size() - 14), results.size());

    val input =
        PyChartInput.builder()
            .data(results)
            .path(path)
            .columnName(metadata.getColumnName())
            .segmentText(metadata.getSegmentText())
            .metric(config.getMetric());

    val res = PyArimaChartFunctionV2.INSTANCE.apply(input.build());

    return res != null && res.getSuccess();
  }
}
