package ai.whylabs.core.aggregation;

import ai.whylabs.core.calculationsV3.BaseCalculationV3;
import ai.whylabs.core.collectors.ExplodedRowCollectorV3;
import ai.whylabs.core.configV3.structure.Analyzer;
import ai.whylabs.core.configV3.structure.MonitorConfigV3;
import ai.whylabs.core.configV3.structure.MonitorConfigV3Utils;
import ai.whylabs.core.configV3.structure.enums.AnalysisMetric;
import ai.whylabs.core.configV3.structure.enums.TargetLevel;
import ai.whylabs.core.enums.AggregationDataGranularity;
import ai.whylabs.core.factories.CalculationFactory;
import ai.whylabs.core.granularity.ComputeJobGranularities;
import ai.whylabs.core.predicatesV3.inclusion.BackfillGracePeriodDurationPredicate;
import ai.whylabs.core.predicatesV3.inclusion.FeaturePredicate;
import ai.whylabs.core.predicatesV3.inclusion.SchedulePredicate;
import ai.whylabs.core.predicatesV3.segment.TargetSegmentPredicate;
import ai.whylabs.core.serde.MonitorConfigV3JsonSerde;
import ai.whylabs.core.structures.ExplodedRow;
import ai.whylabs.core.structures.QueryResultStructure;
import ai.whylabs.core.structures.monitor.events.AnalyzerResult;
import com.google.common.annotations.VisibleForTesting;
import com.google.common.base.Preconditions;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.util.*;
import lombok.Data;
import lombok.Getter;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import org.apache.commons.lang.StringUtils;
import org.apache.commons.lang3.tuple.Pair;
import org.joda.time.DateTimeZone;

@Slf4j
@Data
public class ExplodedRowsToAnalyzerResultsV3 {
  private transient List<BaseCalculationV3> calculations;
  private transient ExplodedRowMerge explodedRowMerge;
  private String runId;

  protected ZonedDateTime currentTime;
  private String orgId;
  private String datasetId;
  private String columnName;
  private String segmentText;
  private TargetLevel targetLevel;
  private AggregationDataGranularity aggregationDataGranularity;
  private MonitorConfigV3 monitorConfigV3;
  private boolean jobLevelOverwriteFlag;
  private String embedableImageBasePath;
  private CalculationFactory calculationFactory;

  /**
   * Backstop how far back target timestamps can be analyzed. This is useful for async adhoc
   * analysis where we want to avoid any baseline from also being analyzed as a target.
   */
  private Long earliestTargetTimestampAllowed;

  @Getter protected transient List<ExplodedRowCollectorV3> collectors;

  /**
   * Don't let a single column for a single segment spend more than x amount of time running a
   * backfill. This is mainly to prevent a big arima backfill from timing out the pipeline (run
   * backfill incrementally)
   */
  private static final long MAX_ANALYSIS_RUNTIME_MILLIS = 10 * 60 * 1000;

  public ExplodedRowsToAnalyzerResultsV3(
      ZonedDateTime currentTime,
      String runId,
      boolean jobLevelOverwriteFlag,
      String embedableImageBasePath,
      CalculationFactory calculationFactory,
      Long earliestTargetTimestampAllowed) {
    this.currentTime = currentTime;
    this.runId = runId;
    this.jobLevelOverwriteFlag = jobLevelOverwriteFlag;
    this.embedableImageBasePath = embedableImageBasePath;
    this.calculationFactory = calculationFactory;
    this.earliestTargetTimestampAllowed = earliestTargetTimestampAllowed;
  }

  public void init() {
    if (explodedRowMerge == null) {
      DateTimeZone.setDefault(DateTimeZone.UTC);
      this.explodedRowMerge = new ExplodedRowMerge();
    }
  }

  public AggregationKey fromAnalyzer(Analyzer analyzer) {
    return AggregationKey.builder()
        .targetLevel(analyzer.getTarget().getLevel())
        .baseline(analyzer.getBaseline())
        .targetProfileId(analyzer.getTarget().getProfileId())
        .targetSize(analyzer.getTargetSize())
        .disableTargetRollup(analyzer.isDisableTargetRollup())
        .build();
  }

  @VisibleForTesting
  List<BaseCalculationV3> initCalculations(
      QueryResultStructure target,
      BaselineRoller baselineRoller,
      MonitorConfigV3 monitorConfig,
      String feature,
      AggregationKey aggregationKey) {

    this.calculations = new ArrayList<>();
    // Group up monitors by shared baseline configuration

    val featurePredicate = new FeaturePredicate();
    val segmentPredicate = new TargetSegmentPredicate();

    for (Analyzer analyzer : monitorConfig.getAnalyzers()) {
      val analyzerAggregationKey = fromAnalyzer(analyzer);

      if ((analyzer.getDisabled() != null && analyzer.getDisabled())
          || !analyzerAggregationKey.equals(aggregationKey)) {
        continue;
      }

      if (!segmentPredicate.test(target, analyzer)) {
        continue;
      }

      if (!featurePredicate.test(
          analyzer,
          MonitorConfigV3Utils.getSchemaWithInferredBackup(
              monitorConfig, feature, target, baselineRoller),
          feature,
          target.getWeight())) {
        // Only init calculations that apply to this feature
        continue;
      }

      BaseCalculationV3 calculation =
          calculationFactory.toCalculation(analyzer, monitorConfig, jobLevelOverwriteFlag);

      if (calculation != null) {
        calculations.add(calculation);
      }
    }

    return calculations;
  }

  public void initCollectors(ExplodedRow explodedRow, boolean reUse) {
    init();
    if (collectors == null || !reUse) {
      collectors = new ArrayList<>();
    }

    if (!explodedRow.getRowTerminator() && (collectors.size() == 0 || !reUse)) {
      int maxBackfill = BackfillGracePeriodDurationPredicate.getMaxBackfill(monitorConfigV3);

      for (AggregationKey aggregation :
          MonitorConfigV3Utils.getUniqueAggregations(
              monitorConfigV3, explodedRow.getColumnName())) {
        if (!aggregation.getTargetLevel().equals(explodedRow.getTargetLevel())) {
          continue;
        }

        switch (explodedRow.getAggregationDataGranularity()) {
            // Individual vs rollup are collected separately as they've been fanned out in
            // V1ProfileFanoutImpl
          case INDIVIDUAL:
            if (aggregation.getDisableTargetRollup() == null
                || !aggregation.getDisableTargetRollup()) {
              continue;
            }
            break;
          case ROLLED_UP:
            if (aggregation.getDisableTargetRollup() != null
                && aggregation.getDisableTargetRollup()) {
              continue;
            }
            break;
        }

        collectors.add(
            new ExplodedRowCollectorV3(
                currentTime,
                monitorConfigV3,
                aggregation.getBaseline(),
                maxBackfill,
                jobLevelOverwriteFlag,
                aggregation.getTargetSize(),
                aggregation.getTargetLevel(),
                aggregation.getTargetProfileId(),
                aggregation.getDisableTargetRollup()));
      }
    }
  }

  @SneakyThrows
  public List<AnalyzerResult> after(ExplodedRowCollectorV3 explodedRowCollector) {
    Set<String> analysisIds = new HashSet<>();
    List<AnalyzerResult> events = new ArrayList<>();
    val p = new SchedulePredicate();
    if (explodedRowCollector != null && explodedRowCollector.getRowsSeen() > 0) {

      // Loop over all the target batch timestamps in the current + late window
      TreeSet<Long> targetBatchTimestamps =
          explodedRowCollector.getPotentialTargetBatchTimestamps(
              ComputeJobGranularities.getLargestDuration(monitorConfigV3));
      if (targetBatchTimestamps.size() == 0) {
        // If a column only exists in a ref profile, there can be zero targets to analyze with
        // disableTargetRollup is enabled
        return events;
      }
      Long mostRecentPotentialTarget = Collections.max(targetBatchTimestamps);

      val monitorFeedback = explodedRowCollector.getMonitorFeedback();
      Map<String, Pair<BaseCalculationV3, AnalyzerResult>> lastCalculationAnomaly = new HashMap<>();

      Map<String, Long> analyzerIdRuntime = new HashMap<>();
      for (Long targetBatchTimestamp : targetBatchTimestamps) {
        if (explodedRowCollector.getTarget(targetBatchTimestamp) != null) {
          if (earliestTargetTimestampAllowed != null
              && targetBatchTimestamp < earliestTargetTimestampAllowed) {
            continue;
          }
          val baselineConfig = explodedRowCollector.getBaseline();

          val target = getTarget(explodedRowCollector, targetBatchTimestamp);

          val targetWithLookbackRolledUp =
              getTargetWithLookbackRolledUp(explodedRowCollector, targetBatchTimestamp);
          val targetWithLookback =
              getTargetWithLookback(explodedRowCollector, targetBatchTimestamp);

          // Sanity check
          if ((target.getOrgid() != null && !target.getOrgid().equals(monitorConfigV3.getOrgId()))
              || (target.getDatasetid() != null
                  && !target.getDatasetid().equals(monitorConfigV3.getDatasetId()))) {
            throw new RuntimeException(
                "Target & monitor config missmatch "
                    + target
                    + " config "
                    + MonitorConfigV3JsonSerde.toString(monitorConfigV3));
          }

          val baselineExplodedRows = explodedRowCollector.getBaselineBuckets(targetBatchTimestamp);
          val baselineRoller = new BaselineRoller(baselineExplodedRows, explodedRowMerge);

          val key =
              AggregationKey.builder()
                  .baseline(baselineConfig)
                  .targetLevel(explodedRowCollector.getTargetLevel())
                  .targetSize(explodedRowCollector.getTargetSize())
                  .targetProfileId(explodedRowCollector.getTargetReferenceProfileId())
                  .disableTargetRollup(explodedRowCollector.isDisableTargetRollup())
                  .build();
          val calculations =
              initCalculations(
                  target,
                  baselineRoller,
                  monitorConfigV3,
                  explodedRowCollector.getColumnName(),
                  key);

          if (calculations == null || calculations.size() == 0) {
            // TODO: Consider weeding out unused feature rows higher up in the stack
            continue;
          }

          val baselineRows = baselineExplodedToQueryStructure(baselineExplodedRows);
          Map<String, AnalyzerResult> analyzerResults = new HashMap<>();
          for (val calculation : calculations) {
            if (calculation.parent()) {
              // Parents don't get generated until a child shows up. That happens in
              // generateParentAnalysisPlaceholders
              continue;
            }
            String analyzerId = calculation.getAnalyzer().getId();
            if (!analyzerIdRuntime.containsKey(analyzerId)) {
              analyzerIdRuntime.put(calculation.getAnalyzer().getId(), 0l);
            }
            if (analyzerIdRuntime.get(analyzerId) > MAX_ANALYSIS_RUNTIME_MILLIS) {
              continue;
            }
            val metric = AnalysisMetric.fromName(calculation.getAnalyzer().getMetric());

            if (target.getMissing() && AnalysisMetric.requireTargetPopulated(metric)) {
              continue;
            }

            val targetTs =
                ZonedDateTime.ofInstant(Instant.ofEpochMilli(targetBatchTimestamp), ZoneOffset.UTC);

            if (!AnalysisMetric.isBackfillable(metric)
                && mostRecentPotentialTarget != targetBatchTimestamp) {
              continue;
            }

            if (p.test(
                calculation.getAnalyzer().getSchedule(),
                /**
                 * Why do we have to re-truncate? Exploded row truncates, with the exception if the
                 * analyzer has disableTargetRollup enabled. We don't want that affecting the
                 * analyzer schedule which expects truncated timestamps.
                 */
                ComputeJobGranularities.truncateTimestamp(
                    targetTs, monitorConfigV3.getGranularity()))) {
              long start = System.currentTimeMillis();
              val event =
                  calculation.run(
                      baselineRows,
                      baselineRoller,
                      target,
                      targetWithLookback,
                      targetWithLookbackRolledUp,
                      targetBatchTimestamp,
                      runId,
                      monitorFeedback,
                      currentTime,
                      explodedRowCollector.getFirstTimestampSeen());
              analyzerIdRuntime.put(
                  analyzerId,
                  analyzerIdRuntime.get(analyzerId) + System.currentTimeMillis() - start);

              if (event != null) {
                Preconditions.checkNotNull(event.getOrgId(), "OrgId should not be null");
                Preconditions.checkArgument(
                    !analysisIds.contains(event.getId()), "Duplicate analysis id");
                analysisIds.add(event.getId());
                analyzerResults.put(event.getAnalyzerId(), event);
                // Put new events into the feedback loop so feedback loops work when doing a
                // backfill
                if (!monitorFeedback.containsKey(event.getDatasetTimestamp())) {
                  monitorFeedback.put(event.getDatasetTimestamp(), new HashMap<>(1));
                }
                monitorFeedback.get(event.getDatasetTimestamp()).put(event.getAnalyzerId(), event);
                // Each analyzer result gets its own row
                events.add(event);

                if (event.getAnomalyCount() != null && event.getAnomalyCount() > 0) {
                  // Tee up for rendering an anomaly chart
                  lastCalculationAnomaly.put(
                      calculation.getAnalyzer().getId(), Pair.of(calculation, event));
                } else if (!jobLevelOverwriteFlag) {
                  // Most recent datapoint is not an anomaly, remove need to render. We render
                  // all images in override mode just b/c otherwise it's really painful to get some
                  // sample data. override mode is only used manually so cost is less of a concern.
                  lastCalculationAnomaly.remove(calculation.getAnalyzer().getId());
                }
              } else {
                log.trace("No calculation produced");
              }
            }
          }
        }
      }

      // Render anomaly chart if it's both the most recent calculation datapoint and anomalous
      if (!StringUtils.isEmpty(embedableImageBasePath)) {
        val chartMetadata = getChartMetadata(explodedRowCollector);
        for (val entry : lastCalculationAnomaly.values()) {
          val calculation = entry.getKey();
          val event = entry.getValue();
          val imagePath = embedableImageBasePath + event.getAnalysisId() + ".png";
          if (calculation.renderAnomalyChart(
              chartMetadata, calculation.getPriorResults(monitorFeedback), imagePath)) {
            event.setImagePath(imagePath);
          }
        }
      }
    }
    log.debug(
        "Produced {} events for column {}", events.size(), explodedRowCollector.getColumnName());
    return events;
  }

  private ChartMetadata getChartMetadata(ExplodedRowCollectorV3 explodedRowCollector) {
    return ChartMetadata.builder()
        .columnName(explodedRowCollector.getColumnName())
        .segmentText(explodedRowCollector.getSegmentText())
        .build();
  }

  @SneakyThrows
  private List<QueryResultStructure> baselineExplodedToQueryStructure(
      Map<Long, ExplodedRow> baselineRows) {
    List<QueryResultStructure> baselineGranularityRollup = new ArrayList(baselineRows.size());
    for (val entry : baselineRows.entrySet()) {
      val a = new QueryResultStructure(entry.getValue(), entry.getKey());
      baselineGranularityRollup.add(a);
    }
    return baselineGranularityRollup;
  }

  @SneakyThrows
  private QueryResultStructure getTarget(
      ExplodedRowCollectorV3 explodedRowCollector, long targetBatchTimestamp) {
    val t = explodedRowCollector.getTarget(targetBatchTimestamp);
    long rollupTimestamp = explodedRowCollector.getRollupTargetTimestamp(t.getTs());
    return new QueryResultStructure(t, rollupTimestamp);
  }

  /** Return the target with its looback merged in if its available and configured to do so */
  @SneakyThrows
  private QueryResultStructure getTargetWithLookbackRolledUp(
      ExplodedRowCollectorV3 explodedRowCollector, long targetBatchTimestamp) {
    val t = explodedRowCollector.getTargetWithLookbackRolledUp(targetBatchTimestamp);
    long rollupTimestamp = explodedRowCollector.getRollupTargetTimestamp(t.getTs());
    return new QueryResultStructure(t, rollupTimestamp);
  }

  @SneakyThrows
  private List<QueryResultStructure> getTargetWithLookback(
      ExplodedRowCollectorV3 explodedRowCollector, long targetBatchTimestamp) {
    val t = explodedRowCollector.getTargetWithLookback(targetBatchTimestamp);
    List<QueryResultStructure> results = new ArrayList<>();
    for (val r : t) {
      long rollupTimestamp = explodedRowCollector.getRollupTargetTimestamp(r.getTs());
      results.add(new QueryResultStructure(r, rollupTimestamp));
    }
    return results;
  }

  public Iterator<AnalyzerResult> call(ExplodedRow explodedRow) {
    List<AnalyzerResult> data = new ArrayList<>();

    initCollectors(explodedRow, true);
    if (checkEndOfData(explodedRow)) {
      // Flush
      log.trace("Flushing {} collectors", collectors.size());
      for (val collector : collectors) {
        data.addAll(after(collector));
      }
      initCollectors(explodedRow, false);
    }

    orgId = explodedRow.getOrgId();
    datasetId = explodedRow.getDatasetId();
    columnName = explodedRow.getColumnName();
    segmentText = explodedRow.getSegmentText();
    targetLevel = explodedRow.getTargetLevel();
    aggregationDataGranularity = explodedRow.getAggregationDataGranularity();

    if (!explodedRow.getRowTerminator()) {
      for (val collector : collectors) {
        collector.collect(explodedRow);
      }
    }

    return data.iterator();
  }

  /**
   * Checks to see if this is the same feature/dataset/org/segment as previously. If not, then we
   * trigger a flush of monitor metrics
   *
   * @param explodedRow
   * @return
   */
  public boolean checkEndOfData(ExplodedRow explodedRow) {
    if (explodedRow.getRowTerminator()) {
      return true;
    }
    if (orgId != null
        && (!explodedRow.getSegmentText().equals(segmentText)
            || !explodedRow.getColumnName().equals(columnName)
            || !explodedRow.getDatasetId().equals(datasetId)
            || !explodedRow.getTargetLevel().equals(targetLevel)
            || !explodedRow.getAggregationDataGranularity().equals(aggregationDataGranularity)
            || !explodedRow.getOrgId().equals(orgId))) {
      return true;
    }

    return false;
  }
}
