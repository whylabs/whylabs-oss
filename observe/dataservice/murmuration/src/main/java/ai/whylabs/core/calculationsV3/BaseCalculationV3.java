package ai.whylabs.core.calculationsV3;

import static java.util.Objects.isNull;

import ai.whylabs.core.aggregation.BaselineRoller;
import ai.whylabs.core.aggregation.ChartMetadata;
import ai.whylabs.core.calculationsV3.results.CalculationResult;
import ai.whylabs.core.configV3.structure.Analyzer;
import ai.whylabs.core.configV3.structure.Baselines.ReferenceProfileId;
import ai.whylabs.core.configV3.structure.MonitorConfigV3;
import ai.whylabs.core.configV3.structure.enums.AnalysisMetric;
import ai.whylabs.core.granularity.GranularityChronoUnitConverter;
import ai.whylabs.core.predicatesV3.inclusion.*;
import ai.whylabs.core.structures.QueryResultStructure;
import ai.whylabs.core.structures.monitor.events.AnalyzerResult;
import ai.whylabs.core.structures.monitor.events.FailureType;
import ai.whylabs.core.utils.MonitorEventIdGenerator;
import java.time.Instant;
import java.time.ZonedDateTime;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.Getter;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import org.apache.commons.lang3.tuple.Pair;

/**
 * @param <T> - Input data type to a calculation
 * @param <R> - Return datatype of a result
 */
@Getter
@Slf4j
public abstract class BaseCalculationV3<T, R extends CalculationResult> {
  public static final String DATASET_METRIC_ROW = "__internal__.datasetMetrics";
  public static final String COMPOSITE_METRIC_ROW = "__internal__.compositeMetrics";

  private MonitorConfigV3 monitorConfigV3;
  private Analyzer analyzer;
  private boolean jobLevelOverwriteFlag;

  public BaseCalculationV3(
      MonitorConfigV3 monitorConfigV3, Analyzer analyzer, boolean jobLevelOverwriteFlag) {
    this.monitorConfigV3 = monitorConfigV3;
    this.analyzer = analyzer;
    this.jobLevelOverwriteFlag = jobLevelOverwriteFlag;
  }

  public List<Pair<Long, CalculationResult>> getPriorResults(
      Map<Long, Map<String, AnalyzerResult>> monitorFeedback) {
    List<Pair<Long, CalculationResult>> priorResults = new ArrayList<>();
    if (monitorFeedback != null) {
      val transformer = getPreviousResultTransformer();
      for (val previousResult : monitorFeedback.entrySet()) {
        if (previousResult.getValue().containsKey(analyzer.getId())) {
          priorResults.add(
              Pair.of(
                  previousResult.getKey(),
                  transformer.apply(previousResult.getValue().get(analyzer.getId()))));
        }
      }
    }
    return priorResults;
  }

  /**
   * We have a series of gates that have to be open in order for a calculation to run. These gates
   * are expressed as a series of java predicates and if they are all open then the calculation is
   * allowed to run.
   *
   * <p>Example scenario: Customer uploaded a year of data this morning, but they have a
   * dataReadinessDuration of PT2D. It'll be a couple days before that gate opens for the
   * calculation to run.
   */
  private boolean shouldCalculationRun(
      ZonedDateTime currentTime,
      MonitorEventIdGenerator eventIdGenerator,
      Map<Long, Map<String, AnalyzerResult>> monitorFeedback,
      Long targetBatchTimestamp,
      List<QueryResultStructure> baseline,
      QueryResultStructure target,
      AnalyzerResult.AnalyzerResultBuilder analyzerResultBuilder,
      Analyzer analyzer) {

    val backfillOverridePredicate =
        new BackfillOverridePredicate(
            jobLevelOverwriteFlag, target.getOrgid(), target.getDatasetid(), analyzer.getId());
    val batchCooldownPredicate = new BatchCooldownPredicate(currentTime);
    val secondsSinceLastUploadPredicate = new SecondsSinceLastUploadPredicate();
    val backfillGracePeriodDurationPredicate =
        new BackfillGracePeriodDurationPredicate(currentTime, jobLevelOverwriteFlag);
    val dataReadinessDurationPredicate = new DataReadinessDurationPredicate(currentTime);

    boolean eventAlreadyCalculated =
        new EventAlreadyCalculated()
            .test(eventIdGenerator, monitorFeedback, targetBatchTimestamp, analyzer.getId());

    /**
     * If backfilling via job level override or the customer triggered backfill API that takes
     * precedence over the monitor config settings like grace period or data readiness.
     */
    if (backfillOverridePredicate.test(targetBatchTimestamp, eventAlreadyCalculated)) {
      analyzerResultBuilder.userInitiatedBackfill(1l);
      return true;
    } else {
      analyzerResultBuilder.userInitiatedBackfill(0l);
    }

    // Short circuit?
    if (!jobLevelOverwriteFlag && eventAlreadyCalculated) {
      log.trace(
          "The calculation for this org+entity+field+segment+analyzer has previously been ran so we "
              + " can skip. This saves us a lot of CPU for the slower calculations");
      return false;
    }
    if (!backfillGracePeriodDurationPredicate.test(
        monitorConfigV3.getGranularity(), analyzer, targetBatchTimestamp)) {
      log.trace("This target is outside the grace period specified in their config");
      return false;
    }
    if (!dataReadinessDurationPredicate.test(analyzer, targetBatchTimestamp)) {
      log.trace(
          "Data's not ready, target batch is too recent according to the customer's configuration");
      return false;
    }

    if (!batchCooldownPredicate.test(baseline, analyzer)
        || !batchCooldownPredicate.test(Arrays.asList(target), analyzer)) {
      log.trace(
          "A datapoint for org {} dataset {} was uploaded too recently, need to let the uploads cool down for {} before the analysis can run",
          target.getOrgid(),
          target.getDatasetid(),
          analyzer.getBatchCoolDownPeriod());
      return false;
    }
    if (!secondsSinceLastUploadPredicate.test(analyzer, currentTime, monitorFeedback)) {
      log.trace(
          "Second since last upload metric has fired too recently per the analyzer schedule, skipping");
      return false;
    }

    return true;
  }

  public MonitorEventIdGenerator getIdGenerator(
      String runId, long targetBatchTimestamp, String segmentText, String columnName) {
    return new MonitorEventIdGenerator(
        monitorConfigV3.getOrgId(),
        monitorConfigV3.getDatasetId(),
        analyzer.getId(),
        targetBatchTimestamp,
        segmentText,
        runId,
        columnName);
  }

  public AnalyzerResult.AnalyzerResultBuilder getAnalyzerResultBuilder(
      String runId, long targetBatchTimestamp, String segmentText, String columnName) {
    long monitorConfigVersion = 0;
    if (monitorConfigV3.getMetadata() != null
        && monitorConfigV3.getMetadata().getVersion() != null) {
      monitorConfigVersion = new Long(monitorConfigV3.getMetadata().getVersion());
    }
    val idGenerator = getIdGenerator(runId, targetBatchTimestamp, segmentText, columnName);
    List<String> monitorIds = new ArrayList<>();
    if (monitorConfigV3.getMonitors() != null) {
      for (val monitor : monitorConfigV3.getMonitors()) {
        if ((monitor.getDisabled() == null || !monitor.getDisabled())
            && monitor.getAnalyzerIds().contains(analyzer.getId())) {
          monitorIds.add(monitor.getId());
        }
      }
    }

    val builder = AnalyzerResult.builder();
    return builder
        .id(idGenerator.getId())
        .latest(true)
        .parent(false)
        .analysisId(idGenerator.getAnalysisId())
        .analyzerId(analyzer.getId())
        .disableTargetRollup(analyzer.isDisableTargetRollup())
        .orgId(monitorConfigV3.getOrgId())
        .analyzerVersion(analyzer.getVersion())
        .runId(runId)
        .anomalyCount(0L)
        .datasetId(monitorConfigV3.getDatasetId())
        .column(columnName)
        .monitorConfigVersion(monitorConfigVersion)
        .granularity(
            GranularityChronoUnitConverter.getDatasetGranularity(monitorConfigV3.getGranularity()))
        .segment(segmentText)
        .creationTimestamp(Instant.now().toEpochMilli())
        .datasetTimestamp(targetBatchTimestamp)
        .metric(analyzer.getMetric())
        .isRollup(requireRollup())
        .monitorIds(monitorIds)
        .analyzerTags(analyzer.getTags());
  }

  /**
   * Some analyzers that say use a targetSize = 7 will exhibit a behavior where 1 anomaly ends up
   * being 7 anomalies. In some analyzers its desirable to filter those anomalies out from future
   * targets within the window.
   */
  private List<QueryResultStructure> filterTargetLookback(
      List<QueryResultStructure> targetWithLookback,
      Map<Long, Map<String, AnalyzerResult>> monitorFeedback,
      long targetBatchTimestamp) {
    if (targetWithLookback.size() < 2 || !enableFilteringAnomaiesFromTargetLookback()) {
      return targetWithLookback;
    }

    Set<Long> skipTimestamps = new HashSet<>();
    for (val e : monitorFeedback.entrySet()) {
      if (e.getKey() == targetBatchTimestamp) {
        continue;
      }

      val a = e.getValue().get(analyzer.getId());
      if (a != null && a.getAnomalyCount() > 0) {
        skipTimestamps.add(e.getKey());
      }
    }

    List<QueryResultStructure> targetWithLookbackFiltered = new ArrayList<>();
    for (val t : targetWithLookback) {
      if (!skipTimestamps.contains(t.getRollupTimestamp())) {
        targetWithLookbackFiltered.add(t);
      }
    }
    return targetWithLookbackFiltered;
  }

  public AnalyzerResult run(
      List<QueryResultStructure> baseline,
      BaselineRoller baselineRoller,
      QueryResultStructure target,
      List<QueryResultStructure> targetWithLookback,
      QueryResultStructure targetWithLookbackRolledUp,
      long targetBatchTimestamp,
      String runId,
      Map<Long, Map<String, AnalyzerResult>> monitorFeedback,
      ZonedDateTime currentTime,
      Long firstTimestampSeen) {

    val builder =
        getAnalyzerResultBuilder(
            runId, targetBatchTimestamp, target.getSegmentText(), target.getColumnName());
    val idGenerator =
        getIdGenerator(
            runId, targetBatchTimestamp, target.getSegmentText(), target.getColumnName());
    targetWithLookback =
        filterTargetLookback(targetWithLookback, monitorFeedback, targetBatchTimestamp);

    // We only use the target (no looback buckets) when deciding whether to run a calculation
    if (!shouldCalculationRun(
        currentTime,
        idGenerator,
        monitorFeedback,
        targetBatchTimestamp,
        baseline,
        target,
        builder,
        analyzer)) {
      return null;
    }

    Long baselineDatapointsUploadedCount = 0L;
    if (baseline != null) {
      for (val b : baseline) {
        if (b.getMissing() == null || !b.getMissing()) {
          baselineDatapointsUploadedCount++;
        }
      }
    }
    Long expectedBaselineDatapointsCount = 0L;
    val granularity = monitorConfigV3.getGranularity();
    if (analyzer.getBaseline() != null
        && analyzer.getBaseline().getExpectedBaselineDatapoints(granularity) != null) {
      expectedBaselineDatapointsCount =
          new Long(analyzer.getBaseline().getExpectedBaselineDatapoints(granularity));
    }

    val analyzerConfig = analyzer.getConfig();
    Long minBatchSize = Long.valueOf(analyzerConfig.getMinBatchSize());

    long start = System.nanoTime();

    builder
        .column(target.getColumnName())
        .expectedBaselineCount(expectedBaselineDatapointsCount)
        .expectedBaselineSuppressionThreshold(minBatchSize)
        .baselineBatchesWithProfileCount(baselineDatapointsUploadedCount)
        .analyzerTags(analyzer.getTags())
        .traceIds(target.getTraceIds());

    if (monitorConfigV3.getWeightConfig() != null
        && monitorConfigV3.getWeightConfig().getMetadata() != null
        && monitorConfigV3.getWeightConfig().getMetadata().getVersion() != null) {
      builder.weightConfigVersion(
          new Long(monitorConfigV3.getWeightConfig().getMetadata().getVersion()));
    }

    if (analyzer.getMetadata() != null && analyzer.getMetadata().getVersion() != null) {
      builder.analyzerConfigVersion(new Long(analyzer.getMetadata().getVersion()));
    } else {
      builder.analyzerConfigVersion(0l);
    }
    if (monitorConfigV3.getEntitySchema() != null
        && monitorConfigV3.getEntitySchema().getMetadata() != null
        && monitorConfigV3.getEntitySchema().getMetadata().getVersion() != null) {
      builder.entitySchemaVersion(
          new Long(monitorConfigV3.getEntitySchema().getMetadata().getVersion()));
    } else {
      builder.entitySchemaVersion(0l);
    }

    if (target.getWeight() != null) {
      builder.segmentWeight(target.getWeight());
      /**
       * Druid doesn't support numeric nulls properly so they show up as zeros. This is fine in the
       * datalake, but when in druid we need an extra flag to distinguish between zero and null
       * because zero is significant with feature importance.
       */
      builder.segmentWeightProvided(true);
    } else {
      builder.segmentWeightProvided(false);
    }

    String algorithm =
        Optional.ofNullable(analyzerConfig.getAlgorithm()).map(a -> a.name()).orElse(null);
    builder
        .algorithm(algorithm)
        .analyzerType(analyzerConfig.getAnalyzerType())
        .algorithmMode(analyzerConfig.getAlgorithmMode())
        .targetLevel(analyzer.getTarget().getLevel());

    if (analyzer.getBaseline() != null
        && analyzer.getBaseline().getClass().isAssignableFrom(ReferenceProfileId.class)) {
      builder.referenceProfileId(((ReferenceProfileId) analyzer.getBaseline()).getProfileId());
    }

    List<Pair<Long, T>> baselineValues = new ArrayList<>();
    List<Pair<Long, T>> targetValues = new ArrayList<>();

    Long baselineDatapointsBeforeRollup = 0l;

    try {
      val metric = analyzer.getMetric();
      val analysisMetric = AnalysisMetric.fromName(metric);
      if (skipMissingDatapointAnalyzer(targetBatchTimestamp, firstTimestampSeen, analysisMetric)) {
        return null;
      }

      // How many baseline buckets had the metric present before rolling em up
      for (val b : baseline) {
        if (!b.getMissing() && analysisMetric.apply(target, currentTime) != null) {
          baselineDatapointsBeforeRollup++;
        }
      }
      builder.baselineCount(baselineDatapointsBeforeRollup);

      if (rollupTarget()) {
        targetValues.add(
            Pair.of(
                target.getRollupTimestamp(),
                // When extracting the metric we include target lookback buckets
                AnalysisMetric.fromName(metric).apply(targetWithLookbackRolledUp, currentTime)));
      } else {
        for (val t : targetWithLookback) {
          targetValues.add(
              Pair.of(
                  t.getRollupTimestamp(), AnalysisMetric.fromName(metric).apply(t, currentTime)));
        }
      }

      // How many target buckets had the metric present
      Long targetDatapoints = 0l;
      for (val t : targetValues) {
        if (t.getRight() != null) {
          targetDatapoints++;
        }
      }
      if (targetDatapoints == 0) {
        log.trace(
            "Analyzer {} missing target and metric {} had no target present for date {}",
            analyzer.getId(),
            metric,
            targetBatchTimestamp);
        return null;
      }
      builder.targetCount(targetDatapoints);
      builder.targetBatchesWithProfileCount((long) targetValues.size());

      // if not enough baseline, don't even bother to run the calculation.
      val alertSuppressed =
          isSuppressed(
              baselineDatapointsBeforeRollup, expectedBaselineDatapointsCount, minBatchSize);
      if (alertSuppressed) {
        builder.anomalyCount(0L);
        builder.failureType(FailureType.InsufficientBaseline);
        return builder.build();
      }

      // Rollups get a single baseline entry
      if (requireRollup()) {
        val baselineAllRolledUp = baselineRoller.get();
        if (isNull(baselineAllRolledUp)) {
          // special handling of missing rolled up baseline to avoid NPE.
          builder.failureType(FailureType.RollupBaselineRequired);
          builder.failureExplanation("No rolled-up baseline available.");
          return builder.build();
        }

        baselineValues.add(
            Pair.of(
                baselineAllRolledUp.getRollupTimestamp(),
                AnalysisMetric.fromName(metric).apply(baselineAllRolledUp, currentTime)));
      } else {
        // A baseline entry for every baseline bucket, including empty ones
        for (val b : baseline) {
          baselineValues.add(
              Pair.of(
                  b.getRollupTimestamp(), AnalysisMetric.fromName(metric).apply(b, currentTime)));
        }
      }

    } catch (Exception e) {
      log.info("Metric \"{}\" unavailable, target {}", analyzer.getMetric(), target, e);
      builder.failureType(FailureType.MetricException);
      builder.failureExplanation(
          String.format("Metric \"%s\" unavailable - %s", analyzer.getMetric(), e));
      return builder.build();
    }

    try {

      List<Pair<Long, CalculationResult>> priorResults = null;
      if (enableFeedbackLoop()) {
        /**
         * It's possible when backfilling that the feedback loop contains data from the future, so
         * we scope the prior results to timestamps before the target batch.
         */
        priorResults =
            getPriorResults(monitorFeedback).stream()
                .filter(s -> s.getLeft() < targetBatchTimestamp)
                .collect(Collectors.toList());
      }

      CalculationResult result = calculate(baselineValues, targetValues, priorResults);
      builder.calculationRuntimeNano(System.nanoTime() - start);
      if (result == null) {
        builder.failureType(FailureType.NoResults);
        builder.failureExplanation("calculation returned no results");
        return builder.build();
      }
      result.populate(builder);
      builder.analyzerResultType(result.getClass().getSimpleName());

      return builder.build();

    } catch (Exception e) {
      builder.failureType(FailureType.CalculationException);
      builder.failureExplanation(e.toString());
      builder.calculationRuntimeNano(System.nanoTime() - start);
      return builder.build();
    }
  }

  public abstract Function<AnalyzerResult, CalculationResult> getPreviousResultTransformer();

  /** Return true/false for whether or not a chart was successfully rendered */
  public abstract boolean renderAnomalyChart(
      ChartMetadata metadata, List<Pair<Long, CalculationResult>> results, String path);

  /**
   * Concept here is that many calculations need a certain amount of baseline to produce something
   * that isn't garbage. That threshold is configurable and this method evaluates whether its below
   * the line.
   */
  private boolean isSuppressed(
      Long baselineDatapointsCount,
      Long expectedBaselineDatapointsCount,
      Long expectedBaselineDatapointsSuppressionThreshold) {
    return (baselineDatapointsCount != null
        && expectedBaselineDatapointsCount != null
        && baselineDatapointsCount
            < Math.min(
                expectedBaselineDatapointsCount, expectedBaselineDatapointsSuppressionThreshold));
  }

  /**
   * Missing datapoints try to fill in the gaps of data, but this can be weird when onboarding a
   * fresh new dataset. We want to avoid alerting for missing data when the missing datapoint
   * predates any datapoints uploaded.
   */
  private boolean skipMissingDatapointAnalyzer(
      Long target, Long firstTimestampSeen, AnalysisMetric metric) {
    if (metric == null || !metric.equals(AnalysisMetric.missingDatapoint)) {
      return false;
    }
    if (firstTimestampSeen != null && target < firstTimestampSeen) {
      return true;
    }
    return false;
  }

  public abstract CalculationResult calculate(
      List<Pair<Long, T>> baseline,
      List<Pair<Long, T>> target,
      List<Pair<Long, CalculationResult>> priorResults);

  public abstract boolean requireRollup();

  /**
   * Previous analyzer results are used as part of this calculation. There is a cost to providing
   * this and not all calculations use it, so make it opt-in.
   */
  public boolean enableFeedbackLoop() {
    return false;
  }

  public boolean parent() {
    return false;
  }

  /**
   * Typically with targetSize = 1 targets are only 1 datapoint anyways. Some analyzers like the
   * monotonic need the target broken out rather than a single datapoint.
   *
   * @return
   */
  public boolean rollupTarget() {
    return true;
  }

  /**
   * Say target size = 7 on an analyzer, one anomaly can end up being 7 anomalies becaues one
   * datapoint was wacky. By default we weed those out, but we don't want to apply that for all
   * types of analyzers.
   */
  public boolean enableFilteringAnomaiesFromTargetLookback() {
    return true;
  }

  public List<Pair<Long, CalculationResult>> getNConsecutiveFromFeedbackLoop(
      List<Pair<Long, CalculationResult>> feedbackLoop, Long nConsecutive) {
    List<Pair<Long, CalculationResult>> consecutiveFeedback = new ArrayList<>();
    if (feedbackLoop == null || feedbackLoop.size() < nConsecutive - 1) {
      return consecutiveFeedback;
    } else {
      List<Long> timestamps = new ArrayList<>();
      Long consecutiveAnomalies = 0l;
      for (val f : feedbackLoop) {
        timestamps.add(f.getKey());
      }
      Collections.sort(timestamps, Collections.reverseOrder());
      timestamps = timestamps.subList(0, nConsecutive.intValue() - 1);
      for (val f : feedbackLoop) {
        if (timestamps.contains(f.getKey())) {
          consecutiveFeedback.add(f);
        }
      }
    }
    return consecutiveFeedback;
  }
}
