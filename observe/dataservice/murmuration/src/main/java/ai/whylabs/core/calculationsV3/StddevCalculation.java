package ai.whylabs.core.calculationsV3;

import static ai.whylabs.core.configV3.structure.Analyzers.ConditionalLimitType.conjunction;
import static ai.whylabs.core.configV3.structure.Analyzers.ConditionalLimitType.disjunction;
import static java.lang.StrictMath.max;
import static java.lang.StrictMath.min;
import static java.lang.StrictMath.sqrt;

import ai.whylabs.core.aggregation.ChartMetadata;
import ai.whylabs.core.calculations.math.GrubbTest;
import ai.whylabs.core.calculationsV3.results.CalculationResult;
import ai.whylabs.core.calculationsV3.results.StddevCalculationResult;
import ai.whylabs.core.configV3.structure.Analyzer;
import ai.whylabs.core.configV3.structure.Analyzers.StddevConfig;
import ai.whylabs.core.configV3.structure.Analyzers.ThresholdType;
import ai.whylabs.core.configV3.structure.MonitorConfigV3;
import ai.whylabs.core.structures.monitor.events.AnalyzerResult;
import ai.whylabs.py.PyChartInput;
import ai.whylabs.py.PyStddevChartFunctionV2;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.NonNull;
import lombok.val;
import org.apache.commons.lang3.tuple.Pair;
import org.apache.commons.math3.distribution.NormalDistribution;
import org.apache.commons.math3.stat.descriptive.DescriptiveStatistics;

/**
 * Calculates upper bounds and lower bounds based on stddev from a series of numbers.
 *
 * <p>An analyzer using stddev for a window of time range.
 *
 * <p>This calculation will fall back to Poisson distribution if there is only 1 value in the
 * baseline
 */
public class StddevCalculation extends BaseCalculationV3<Double, StddevCalculationResult> {
  public static final String DEFAULT_SIGNIFICANCE_LEVEL = "0.95";
  public static final String DEFAULT_ALPHA_VALUE = "0.05";
  public static final String DEFAULT_LAMBDA_KEEP = "0.50";

  private final StddevConfig config;
  private final Boolean enableChart;
  private final Boolean enableAnomalyReplacement;
  private final Boolean enableGrubb;
  private final Boolean enableAlertsFilter;
  private final Double grubbSignificance;
  private final Double alpha;
  private final Double lambdaKeep;
  private final Random random = new Random();

  public StddevCalculation(
      MonitorConfigV3 monitorConfigV3,
      Analyzer analyzer,
      boolean overwriteEvents,
      @NonNull StddevConfig config) {
    super(monitorConfigV3, analyzer, overwriteEvents);
    this.config = config;

    // Monitor config can override some stddev parameters
    val params = config.getParams();
    this.enableChart = Boolean.valueOf(params.get("enableAnomalyCharts"));
    this.enableAnomalyReplacement = Boolean.valueOf(params.get("enableAnomalyReplacement"));
    this.enableGrubb = Boolean.valueOf(params.get("enableGrubb"));
    this.enableAlertsFilter = Boolean.valueOf(params.get("enableAlertsFilter"));
    val significance =
        Optional.ofNullable(params.get("grubbSignificance")).orElse(DEFAULT_SIGNIFICANCE_LEVEL);
    this.grubbSignificance = Double.valueOf(significance);
    val alpha = Optional.ofNullable(params.get("alpha")).orElse(DEFAULT_ALPHA_VALUE);
    this.alpha = Double.valueOf(alpha);
    val lambdaKeep = Optional.ofNullable(params.get("lambdaKeep")).orElse(DEFAULT_LAMBDA_KEEP);
    this.lambdaKeep = Double.valueOf(lambdaKeep);

    // to set seed of RNG.  Useful when running repeatable unit tests.
    val seed = Optional.ofNullable(params.get("seed")).map(Long::valueOf).orElse(null);
    if (Objects.nonNull(seed)) random.setSeed(seed);
  }

  public boolean enableFeedbackLoop() {
    return true;
  }

  @Override
  public StddevCalculationResult calculate(
      List<Pair<Long, Double>> baseline,
      List<Pair<Long, Double>> target,
      List<Pair<Long, CalculationResult>> priorResults) {

    if (config.getMinLowerThreshold() > config.getMaxUpperThreshold()) {
      throw new RuntimeException(
          String.format(
              "This config has min threshold of %f > max threshold of %f",
              config.getMinLowerThreshold(), config.getMaxUpperThreshold()));
    }

    if (enableAlertsFilter) {
      // remove timepoints that were previously alerted
      val alertedTimestamps =
          priorResults.stream()
              .filter(p -> p.getValue().getAlertCount() != 0)
              .map(Pair::getKey)
              .collect(Collectors.toSet());

      if (alertedTimestamps.size() > 0) {
        baseline =
            baseline.stream()
                .filter(p -> !alertedTimestamps.contains(p.getKey()))
                .collect(Collectors.toList());
      }
    }

    if (enableAnomalyReplacement && priorResults != null) {
      // replace prior values; likely inclusive of `enableAlertsFilter`, but it doesn't hurt to
      // check if there are still values to replace.
      final Map<Long, Double> replaceTimestamps =
          priorResults.stream()
              .filter(Objects::nonNull) //
              .filter(p -> Objects.nonNull(p.getValue()))
              .filter(p -> Objects.nonNull(p.getValue().getShouldReplace()))
              .filter(p -> p.getValue().getShouldReplace())
              .collect(Collectors.toMap(Pair::getKey, p -> p.getValue().getReplacementValue()));

      if (replaceTimestamps.size() > 0) {
        baseline =
            baseline.stream()
                .map(
                    p -> {
                      val timestamp = p.getKey();
                      if (replaceTimestamps.containsKey(timestamp)) {
                        return Pair.of(timestamp, replaceTimestamps.get(timestamp));
                      }
                      return p;
                    })
                .collect(Collectors.toList());
      }
    }

    // remove null and NaN values
    val nonNullValues =
        baseline.stream()
            .map(Pair::getValue)
            .filter(d -> d != null && !d.equals(Double.NaN))
            .collect(Collectors.toList());

    List<Double> filtered = nonNullValues;
    if (enableGrubb) {
      filtered = GrubbTest.filter(nonNullValues, grubbSignificance);
    }

    val stats = new DescriptiveStatistics();
    filtered.forEach(stats::addValue);
    val minBatchSize = config.getMinBatchSize();
    if (stats.getN() < minBatchSize) {
      throw new RuntimeException(
          String.format("Calculation requires at least %d datapoints", minBatchSize));
    }

    // if only one baseline value, fallback to stddev of poisson, which is sqrt(mean).
    val mean = stats.getMean();
    double stddev = (stats.getN() == 1 ? sqrt(mean) : stats.getStandardDeviation());
    double upper = mean + config.getFactor() * stddev;
    double lower = mean - config.getFactor() * stddev;

    Double adjustedPrediction = null;
    Double replacement = null;
    boolean shouldReplace = false;
    if (enableAnomalyReplacement) {
      final int adjustmentTries = 10;
      final double actual = target.get(0).getValue();
      final double forecast = mean;
      final double oob_multiple = 1.0;
      final double shouldReplaceUpper = forecast + (upper - forecast) * oob_multiple;
      final double shouldReplaceLower = forecast - (forecast - lower) * oob_multiple;

      if (actual < shouldReplaceLower || actual > shouldReplaceUpper) {
        shouldReplace = true;
        val ppf = new NormalDistribution().inverseCumulativeProbability(1 - (alpha / 2));
        stddev = (upper - lower) * ppf;
        final double rand = random.doubles().limit(adjustmentTries).average().getAsDouble();
        adjustedPrediction = forecast + stddev * rand;
        replacement = actual * lambdaKeep + (1 - lambdaKeep) * adjustedPrediction;
      }
    }

    // clamp calculated limits to threshold overrides.
    if (config.getLimitType() == null || config.getLimitType() == disjunction) {
      // alert if target exceeds stddev * factor, OR exceeds fixed threshold
      upper = min(config.getMaxUpperThreshold(), max(upper, config.getMinLowerThreshold()));
      lower = max(config.getMinLowerThreshold(), min(lower, config.getMaxUpperThreshold()));
    } else if (config.getLimitType() == conjunction) {
      // alert if target exceeds stddev * factor, AND exceeds fixed threshold
      upper = max(config.getMaxUpperThreshold(), max(upper, config.getMinLowerThreshold()));
      lower = min(config.getMinLowerThreshold(), min(lower, config.getMaxUpperThreshold()));
    } else {
      throw new RuntimeException(
          String.format("unrecognized limit type \"%s\"", config.getLimitType()));
    }

    // If a direction is specified, alert on only one threshold
    boolean alerted;
    final Double v = target.get(0).getValue();
    if (config.getThresholdType() == ThresholdType.upper) {
      alerted = v > upper;
    } else if (config.getThresholdType() == ThresholdType.lower) {
      alerted = v < lower;
    } else {
      alerted = v < lower || v > upper;
    }

    val builder = StddevCalculationResult.builder();
    builder
        .alertCount(alerted ? 1L : 0L)
        .upperThreshold(upper)
        .lowerThreshold(lower)
        .value(v)
        .replacementValue(replacement)
        .shouldReplace(shouldReplace)
        .adjustedPrediction(adjustedPrediction)
        .lambdaKeep(lambdaKeep)
        .absoluteUpper(config.getMaxUpperThreshold())
        .absoluteLower(config.getMinLowerThreshold())
        .factor(config.getFactor())
        .numBatchSize((int) stats.getN());

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
        return StddevCalculationResult.builder()
            /** Commenting out what's unused to reduced object churn/cpu hotspotting */
            // .factor(analyzerResult.getThreshold_factor())
            // .numBatchSize(analyzerResult.getThreshold_minBatchSize())
            .value(analyzerResult.getThreshold_metricValue())
            // .lowerThreshold(analyzerResult.getThreshold_calculatedLower())
            // .upperThreshold(analyzerResult.getThreshold_calculatedUpper())
            // .absoluteLower(analyzerResult.getThreshold_absoluteLower())
            // .absoluteUpper(analyzerResult.getThreshold_absoluteUpper())
            .alertCount(analyzerResult.getAnomalyCount())
            .shouldReplace(analyzerResult.getSeasonal_shouldReplace())
            // .lambdaKeep(analyzerResult.getSeasonal_lambdaKeep())
            .replacementValue(analyzerResult.getSeasonal_replacement())
            .adjustedPrediction(analyzerResult.getSeasonal_adjusted_prediction())
            .build();
      }
    };
  }

  @Override
  public boolean renderAnomalyChart(
      ChartMetadata metadata, List<Pair<Long, CalculationResult>> results, String path) {
    if (!this.enableChart) {
      return false;
    }

    // prior results are not ordered - sort by timestamp before plotting.
    results.sort(
        new Comparator<Pair<Long, CalculationResult>>() {
          @Override
          public int compare(Pair<Long, CalculationResult> u1, Pair<Long, CalculationResult> u2) {
            return u1.getKey().compareTo(u2.getKey());
          }
        });

    // limit chart baseline to 14 days
    results = results.subList(Math.max(0, results.size() - 14), results.size());

    val input =
        PyChartInput.builder()
            .data(results)
            .path(path)
            .columnName(metadata.getColumnName())
            .segmentText(metadata.getSegmentText())
            .metric(config.getMetric());

    val res = PyStddevChartFunctionV2.INSTANCE.apply(input.build());
    return res == null || res.getSuccess() == null || res.getSuccess();
  }
}
