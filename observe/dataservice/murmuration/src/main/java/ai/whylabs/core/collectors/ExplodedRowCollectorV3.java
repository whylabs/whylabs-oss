package ai.whylabs.core.collectors;

import ai.whylabs.core.aggregation.AnalyzerResultToExplodedRow;
import ai.whylabs.core.aggregation.ExplodedRowMerge;
import ai.whylabs.core.configV3.structure.Baselines.Baseline;
import ai.whylabs.core.configV3.structure.Baselines.ReferenceProfileId;
import ai.whylabs.core.configV3.structure.MonitorConfigV3;
import ai.whylabs.core.configV3.structure.enums.Granularity;
import ai.whylabs.core.configV3.structure.enums.TargetLevel;
import ai.whylabs.core.granularity.ComputeJobGranularities;
import ai.whylabs.core.granularity.TargetBatchDateCalculator;
import ai.whylabs.core.predicates.TargetTimeRangePredicateExplodedRow;
import ai.whylabs.core.predicatesV3.BaselineTimerangePredicateExplodedRowV3;
import ai.whylabs.core.predicatesV3.baseline.TrailingWindowExclusionPredicate;
import ai.whylabs.core.predicatesV3.inclusion.BackfillRequestPresentForDatasetPredicate;
import ai.whylabs.core.structures.ExplodedRow;
import ai.whylabs.core.structures.monitor.events.AnalyzerResult;
import java.io.Serializable;
import java.time.DayOfWeek;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.TreeSet;
import lombok.*;
import lombok.experimental.FieldNameConstants;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;

@Slf4j
@ToString
@FieldNameConstants
@Data
@Builder(toBuilder = true)
@NoArgsConstructor
@AllArgsConstructor
public class ExplodedRowCollectorV3 implements Serializable {
  private transient ExplodedRowMerge explodedRowMerge;
  private String orgId;
  private String datasetId;
  private String columnName;
  private String segmentText;
  private TargetLevel targetLevel;
  private Granularity modelGranularity;
  private Baseline baseline;
  private String baselineReferenceProfileId = null;
  private String targetReferenceProfileId = null;
  private Integer rowsSeen = 0;
  private Long firstTimestampSeen;
  private Long lastUploadTimestamp = 0l;

  private HashMap<Long, Map<String, AnalyzerResult>> monitorFeedback = new HashMap<>();
  private HashMap<Long, ExplodedRow> baselineBuckets = new HashMap<>();
  private HashMap<Long, ExplodedRow> targetBuckets = new HashMap<>();
  private HashMap<Long, ExplodedRow> targetBucketsLookback = new HashMap<>();
  private transient BaselineTimerangePredicateExplodedRowV3 baselinePredicate;
  private transient TargetTimeRangePredicateExplodedRow targetTimeRangePredicate;
  private boolean backfillMode = false;
  private boolean disableTargetRollup;
  private int targetSize;
  private long targetBatchTimestamp;
  private long currentTime;

  // TODO: make the week origin configurable on a per model basis
  private static final DayOfWeek weekOrigin = DayOfWeek.MONDAY;

  public ExplodedRowCollectorV3(
      ZonedDateTime currentTime,
      MonitorConfigV3 config,
      Baseline baseline,
      int lateWindowDays,
      boolean jobLevelOverride,
      int targetSize,
      TargetLevel targetLevel,
      String targetReferenceProfileId,
      boolean disableTargetRollup) {

    modelGranularity = config.getGranularity();
    this.currentTime = currentTime.toInstant().toEpochMilli();
    this.baseline = baseline;
    if (ReferenceProfileId.class.isInstance(baseline))
      // cache reference profile ID.
      this.baselineReferenceProfileId = ((ReferenceProfileId) baseline).getProfileId();
    this.targetSize = targetSize;
    this.targetLevel = targetLevel;
    this.orgId = config.getOrgId();
    this.datasetId = config.getDatasetId();

    targetBatchTimestamp =
        TargetBatchDateCalculator.getTargetbatchTimestamp(
            currentTime, modelGranularity, weekOrigin);

    baselinePredicate =
        new BaselineTimerangePredicateExplodedRowV3(
            targetBatchTimestamp, modelGranularity, lateWindowDays, baseline, targetSize);
    targetTimeRangePredicate =
        new TargetTimeRangePredicateExplodedRow(
            currentTime,
            modelGranularity,
            lateWindowDays,
            config.isAllowPartialTargetBatches(),
            disableTargetRollup);

    backfillMode =
        new BackfillRequestPresentForDatasetPredicate(jobLevelOverride)
            .test(config.getOrgId(), config.getDatasetId());

    this.explodedRowMerge = new ExplodedRowMerge();
    this.targetReferenceProfileId = targetReferenceProfileId;
    this.disableTargetRollup = disableTargetRollup;
  }

  private ExplodedRowMerge getMerger() {
    if (explodedRowMerge == null) {
      this.explodedRowMerge = new ExplodedRowMerge();
    }
    return this.explodedRowMerge;
  }

  /**
   * All potential and present target timestamps within the backfill grace period sorted ascending
   *
   * @param backfillGracePeriodDuration
   * @return
   */
  public TreeSet<Long> getPotentialTargetBatchTimestamps(Duration backfillGracePeriodDuration) {
    TreeSet<Long> potentialTargetTimestamps = new TreeSet<>();
    potentialTargetTimestamps.addAll(targetBuckets.keySet());
    if (!disableTargetRollup) {
      // When rollups are disabled we don't extrapolate potential timestamps as anything but what we
      // see
      potentialTargetTimestamps.addAll(
          TargetTimeRangePredicateExplodedRow.getPotentialTargetTimestamps(
              getModelGranularity(),
              ZonedDateTime.ofInstant(Instant.ofEpochMilli(currentTime), ZoneOffset.UTC),
              backfillGracePeriodDuration));
    }

    return potentialTargetTimestamps;
  }

  /**
   * For a particular targetBatchTimestamp retrieve all the contributing baseline rows merged to the
   * model granularity.
   */
  public Map<Long, ExplodedRow> getBaselineBuckets(Long targetBatchTimestamp) {
    if (disableTargetRollup) {
      // Target wasn't rolled up, but baselines are, so we need to re-truncate here
      targetBatchTimestamp = getRollupBaselineTimestamp(targetBatchTimestamp);
    }

    Map<Long, ExplodedRow> targetBatchBaseline = new TreeMap<>();
    val predicate =
        new BaselineTimerangePredicateExplodedRowV3(
            targetBatchTimestamp, modelGranularity, 0, baseline, targetSize);

    for (val entry : baselineBuckets.entrySet()) {
      if (predicate.test(entry.getValue())) {
        long rollupTimestamp =
            ComputeJobGranularities.getBaselineRollupTimestamp(
                weekOrigin, entry.getValue().getTs(), modelGranularity);
        if (new TrailingWindowExclusionPredicate().test(baseline, rollupTimestamp)) {
          continue;
        }
        if (targetBatchBaseline.containsKey(rollupTimestamp)) {
          // Merge baseline as we collect
          val merged =
              getMerger()
                  .merge(Arrays.asList(targetBatchBaseline.get(rollupTimestamp), entry.getValue()));
          targetBatchBaseline.put(rollupTimestamp, merged);
        } else {
          targetBatchBaseline.put(rollupTimestamp, entry.getValue());
        }
      }
    }

    /**
     * Fill in null entries for missing baseline datapoints. For example, some timeseries algos will
     * be interested in missing rows
     */
    for (Long rollUpTimestamp : predicate.getPotentialBaselineTimestamps(baseline)) {
      if (!targetBatchBaseline.containsKey(rollUpTimestamp)) {
        targetBatchBaseline.put(
            rollUpTimestamp,
            ExplodedRow.builder()
                .orgId(orgId)
                .datasetId(datasetId)
                .segmentText(segmentText)
                .columnName(columnName)
                .ts(rollUpTimestamp)
                .missing(true)
                .build());
      }
    }

    return targetBatchBaseline;
  }

  /**
   * Retrieve the baseline for a particular targetBatchTimestamp. This enables a single collector to
   * cover the ground of multiple batches (say a late window or catching up a job after several
   * failed runs).
   *
   * <p>Design note here: Rolling up for each timestamp when requested rather than putting all the
   * results for all target batches into a hashmap reduces the memory pressure of the collector such
   * that we don't have n copies of the data in memory for n targetBatchTimestamps.
   */
  public ExplodedRow getBaselineRolledUp(Long targetBatchTimestamp) {
    // TODO: Remove?
    List<ExplodedRow> rows = new ArrayList<>();

    val predicate =
        new BaselineTimerangePredicateExplodedRowV3(
            targetBatchTimestamp, modelGranularity, 0, baseline, targetSize);

    for (ExplodedRow row : baselineBuckets.values()) {
      if (!predicate.test(row)) {
        continue;
      }
      rows.add(row);
    }
    return getMerger().merge(rows);
  }

  public ExplodedRow getTargetWithLookbackRolledUp(Long targetBatchTimestamp) {
    ExplodedRow target = getTarget(targetBatchTimestamp);
    val targetRows = getTargetLookbackRows(targetBatchTimestamp);
    targetRows.add(target);

    if (targetRows.size() > 1) {
      return getMerger().merge(targetRows);
    }
    return target;
  }

  public List<ExplodedRow> getTargetWithLookback(Long targetBatchTimestamp) {
    ExplodedRow target = getTarget(targetBatchTimestamp);
    val targetRows = getTargetLookbackRows(targetBatchTimestamp);
    targetRows.add(target);
    return targetRows;
  }

  private ArrayList<ExplodedRow> getTargetLookbackRows(Long targetBatchTimestamp) {
    ArrayList<ExplodedRow> targetRows = new ArrayList<>();
    val ts = ZonedDateTime.ofInstant(Instant.ofEpochMilli(targetBatchTimestamp), ZoneOffset.UTC);
    for (int x = 1; x < targetSize; x++) {
      val targetTs =
          ComputeJobGranularities.subtract(ts, modelGranularity, x).toInstant().toEpochMilli();

      if (targetBucketsLookback.containsKey(targetTs)) {
        targetRows.add(targetBucketsLookback.get(targetTs));
      }
    }
    return targetRows;
  }

  public ExplodedRow getTarget(Long targetBatchTimestamp) {
    if (targetBuckets.get(targetBatchTimestamp) != null) {
      return targetBuckets.get(targetBatchTimestamp);
    }

    // this is key for missingDatapoint detection.  By generating an ExplodedRow with
    // missing=true, we ensure that all targets are populated and the missingDatapoint metric
    // will pick up this target, if enabled.
    return ExplodedRow.builder()
        .orgId(orgId)
        .datasetId(datasetId)
        .segmentText(segmentText)
        .columnName(columnName)
        .ts(targetBatchTimestamp)
        .missing(true)
        .build();
  }

  public long getRollupTargetTimestamp(long ts) {
    if (disableTargetRollup) {
      return ts;
    }
    /**
     * Roll up timestamp to the granularity. EG if collecting for a daily monitor and you get a
     * timestamp of 2021-09-03T09:45:22.000Z Then we'll roll that up to the nearest day
     * 2021-09-03T00:00:00.000Z
     */
    return getRollupBaselineTimestamp(ts);
  }

  public long getRollupBaselineTimestamp(long ts) {
    /**
     * Roll up timestamp to the granularity. EG if collecting for a daily monitor and you get a
     * timestamp of 2021-09-03T09:45:22.000Z Then we'll roll that up to the nearest day
     * 2021-09-03T00:00:00.000Z
     */
    return ComputeJobGranularities.truncateTimestamp(ts, modelGranularity);
  }

  public void merge(ExplodedRowCollectorV3 otherCollector) {
    for (val t : otherCollector.getTargetBuckets().entrySet()) {
      addTarget(t.getKey(), t.getValue());
      addTargetBucketLookback(t.getKey(), t.getValue());
    }
    for (val b : otherCollector.getBaselineBuckets().entrySet()) {
      addBaseline(b.getKey(), b.getValue());
    }
    for (val entry : otherCollector.getMonitorFeedback().entrySet()) {
      if (!monitorFeedback.containsKey(entry.getKey())) {
        monitorFeedback.put(entry.getKey(), new HashMap<>());
      }

      for (val a : entry.getValue().entrySet()) {
        monitorFeedback.get(entry.getKey()).put(a.getKey(), a.getValue());
      }
    }
    rowsSeen += otherCollector.getRowsSeen();
  }

  public void collect(ExplodedRow explodedRow) {

    rowsSeen++;
    columnName = explodedRow.getColumnName();
    segmentText = explodedRow.getSegmentText();

    if (!explodedRow.getTargetLevel().equals(targetLevel)) {
      return;
    }
    if (explodedRow.getFeedbackAnalysisId() != null) {
      if (!monitorFeedback.containsKey(explodedRow.getTs())) {
        monitorFeedback.put(explodedRow.getTs(), new HashMap<>());
      }
      val r = AnalyzerResultToExplodedRow.to(explodedRow);
      monitorFeedback.get(explodedRow.getTs()).put(r.getAnalyzerId(), r);
      return;
    }

    /**
     * Roll up timestamp to the granularity. EG if collecting for a daily monitor and you get a
     * timestamp of 2021-09-03T09:45:22.000Z Then we'll roll that up to the nearest day
     * 2021-09-03T00:00:00.000Z
     */
    long rollupTargetTimestamp = getRollupTargetTimestamp(explodedRow.getTs());

    if (explodedRow.getIngestionMetricRow() != null && explodedRow.getIngestionMetricRow()) {
      // Ingestion metrics are generated for currentTime which is generally excluded from
      // aggregation
      rollupTargetTimestamp = explodedRow.getTs();

      addTarget(rollupTargetTimestamp, explodedRow);
      // In backfill mode we collect everything for simplicity and filter afterwards
    } else if (targetTimeRangePredicate.test(explodedRow)
        || (targetReferenceProfileId != null
            && StringUtils.equals(targetReferenceProfileId, explodedRow.getProfileId()))
        || (backfillMode && currentTime > rollupTargetTimestamp)) {

      addTarget(rollupTargetTimestamp, explodedRow);
    }
    addTargetBucketLookback(rollupTargetTimestamp, explodedRow);

    if (explodedRow.getIngestionMetricRow() == false
        && (baselinePredicate.test(explodedRow) || backfillMode)) {
      addBaseline(getRollupBaselineTimestamp(explodedRow.getTs()), explodedRow);
    }
  }

  @SneakyThrows
  private void addTarget(long rollupTimestamp, ExplodedRow explodedRow) {

    /**
     * Reference profiles are an option for using as a baseline to compare against a target however
     * they should be ignored for consideration as a target datapoint.
     */
    if (!StringUtils.isEmpty(explodedRow.getProfileId())
        && StringUtils.isEmpty(targetReferenceProfileId)) {
      // Discard ref profile data when target is not a ref profile
      return;
    }
    if (StringUtils.isEmpty(explodedRow.getProfileId())
        && !StringUtils.isEmpty(targetReferenceProfileId)) {
      // When target is a ref profile discard non-ref profile data
      return;
    }
    if (explodedRow.getProfileId() != null
        && targetReferenceProfileId != null
        && !explodedRow.getProfileId().equals(targetReferenceProfileId)) {
      // It's a ref profile, but not the one this collector is configured to care about
      return;
    }
    if (firstTimestampSeen == null || firstTimestampSeen > explodedRow.getTs()) {
      firstTimestampSeen = explodedRow.getTs();
    }

    if (explodedRow.getLastUploadTs() != null
        && lastUploadTimestamp < explodedRow.getLastUploadTs()) {
      lastUploadTimestamp = explodedRow.getLastUploadTs();
    }

    if (!StringUtils.isEmpty(targetReferenceProfileId)) {
      // Ref profiles don't have time so we override it to the target batch so we get anomalies for
      // today
      explodedRow.setTs(targetBatchTimestamp);
      rollupTimestamp = getRollupTargetTimestamp(explodedRow.getTs());
    }

    if (targetBuckets.containsKey(rollupTimestamp)) {
      // Merge baseline as we collect

      targetBuckets.put(
          rollupTimestamp,
          getMerger().merge(Arrays.asList(targetBuckets.get(rollupTimestamp), explodedRow)));

    } else {
      targetBuckets.put(rollupTimestamp, explodedRow);
    }
  }

  /**
   * Suppose you have a dataset that's day of week. On a daily model you may want a target that adds
   * 6d of previous data so you can detect that something other than monday-sunday made it into the
   * list. This target lookback period is aggregated separately from the target buckets and merged
   * later so that the lookback data doesn't affect the gating mechanisms for whether a datapoint
   * should be analyzed. For example you've got 6d of lookback data but the upload is late for the
   * actual target. We'll want to hold off on that analysis until the target is in place.
   */
  private void addTargetBucketLookback(long rollupTimestamp, ExplodedRow explodedRow) {
    if (targetSize <= 1 || !StringUtils.isEmpty(explodedRow.getProfileId())) {
      return;
    }

    if (targetBucketsLookback.containsKey(rollupTimestamp)) {
      targetBucketsLookback.put(
          rollupTimestamp,
          getMerger()
              .merge(Arrays.asList(targetBucketsLookback.get(rollupTimestamp), explodedRow)));
    } else {
      targetBucketsLookback.put(rollupTimestamp, explodedRow);
    }
  }

  /**
   * Accumulate baseline profiles as specified by analyzer config `baseline`.
   *
   * <p>NOTE: segment predicate has already been applied; only rows with segments matching MV3
   * targetMatrix appear here.
   */
  private void addBaseline(long rollupTimestamp, ExplodedRow explodedRow) {
    // reference profiles use timestamp=0 to facilitate merging segmented reference profiles.
    if (explodedRow.getProfileId() != null) {
      rollupTimestamp = 0;
    }
    // If using reference baseline, only accept profiles with same id.
    if (baselineReferenceProfileId == null
        || baselineReferenceProfileId.equals(explodedRow.getProfileId())) {
      if (baselineBuckets.containsKey(rollupTimestamp)) {
        // Merge baseline as we collect
        baselineBuckets.put(
            rollupTimestamp,
            getMerger().merge(Arrays.asList(baselineBuckets.get(rollupTimestamp), explodedRow)));
      } else {
        baselineBuckets.put(rollupTimestamp, explodedRow);
      }
    }
  }
}
