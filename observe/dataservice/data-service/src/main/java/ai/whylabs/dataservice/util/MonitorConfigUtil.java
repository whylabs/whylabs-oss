package ai.whylabs.dataservice.util;

import ai.whylabs.core.configV3.structure.Analyzer;
import ai.whylabs.core.configV3.structure.MonitorConfigV3;
import ai.whylabs.core.configV3.structure.enums.AnalysisMetric;
import ai.whylabs.core.configV3.structure.enums.Granularity;
import ai.whylabs.core.granularity.ComputeJobGranularities;
import ai.whylabs.core.granularity.GranularityChronoUnitConverter;
import ai.whylabs.core.serde.MonitorConfigV3JsonSerde;
import ai.whylabs.dataservice.structures.PgMonitorSchedule;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.util.*;
import javax.annotation.Nullable;
import lombok.NonNull;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import org.joda.time.Interval;

@Slf4j
public class MonitorConfigUtil {

  /**
   * Returns the set of analyzerIds that were in `old` but are not in `updated`.
   *
   * <p>Returns empty set if `old` is null.
   */
  public static Set<String> getRemovedAnalyzerIds(
      @Nullable MonitorConfigV3 old, @NonNull MonitorConfigV3 updated) {
    Set<String> oldAnalyzerIds = new HashSet<>();
    if (old != null) {
      for (val oldAnalyzer : old.getAnalyzers()) {
        oldAnalyzerIds.add(oldAnalyzer.getId());
      }
    }
    for (val newAnalyzer : updated.getAnalyzers()) {
      oldAnalyzerIds.remove(newAnalyzer.getId());
    }
    return oldAnalyzerIds;
  }

  public static Collection<Analyzer> getNewAnalyzers(
      @Nullable MonitorConfigV3 old, @NonNull MonitorConfigV3 updated) {
    Map<String, Analyzer> newAnalyzers = new HashMap<>();
    for (val newAnalyzer : updated.getAnalyzers()) {
      val m = AnalysisMetric.fromName(newAnalyzer.getMetric());
      if (m.equals(AnalysisMetric.secondsSinceLastUpload)
          || m.equals(AnalysisMetric.missingDatapoint)) {
        continue;
      }
      newAnalyzers.put(newAnalyzer.getId(), newAnalyzer);
    }

    if (old != null) {
      for (val oldAnalyzer : old.getAnalyzers()) {
        newAnalyzers.remove(oldAnalyzer.getId());
      }
    }

    return newAnalyzers.values();
  }

  /** Convenience function - compute schedules based on current time, unless in a unit test. */
  public static List<PgMonitorSchedule> convertToSchedules(MonitorConfigV3 updated) {
    return convertToSchedules(updated, ZonedDateTime.now(ZoneOffset.UTC));
  }

  /**
   * Create PgMonitorSchedulers for all analyzers in a monitor config.
   *
   * <p>Does not check if monitor or analyzers are enabled.
   */
  public static List<PgMonitorSchedule> convertToSchedules(
      MonitorConfigV3 updated, ZonedDateTime currentTime) {

    List<PgMonitorSchedule> schedules = new ArrayList<>();
    for (final Analyzer analyzer : updated.getAnalyzers()) {
      if (analyzer.getSchedule() == null || analyzer.getMetric() == null) {
        log.info(
            "Analyzer {} org {} dataset {} has either no schedule or no metric, skipping",
            analyzer.getId(),
            updated.getOrgId(),
            updated.getDatasetId());
        continue;
      }
      val b =
          buildSchedule(analyzer, updated.getGranularity(), currentTime)
              .orgId(updated.getOrgId())
              .analyzerType(analyzer.getConfig().getAnalyzerType())
              .monitorId(getMonitorId(updated, analyzer.getId()))
              .datasetId(updated.getDatasetId());
      schedules.add(b.build());
    }
    return schedules;
  }

  public static String getMonitorId(MonitorConfigV3 conf, String analyzerId) {
    String monitorId = null;
    if (conf.getMonitors() != null && analyzerId != null) {
      for (val m : conf.getMonitors()) {
        if (m.getAnalyzerIds().contains(analyzerId)) {
          monitorId = m.getId();
        }
      }
    }
    return monitorId;
  }

  public static String getAnalyzerType(MonitorConfigV3 conf, String analyzerId) {
    if (conf.getAnalyzers() == null || conf.getAnalyzers().isEmpty()) {
      return null;
    }
    for (val analyzer : conf.getAnalyzers()) {
      if (analyzer.getId().equals(analyzerId)) {
        return analyzer.getConfig().getAnalyzerType();
      }
    }
    return null;
  }

  /**
   * Build PgMonitorScheduler for a single analyzer config. OrgID and datasetID must be added before
   * returned schedule builder is complete. `currentTime` is used to compute target bucket and
   * interval based on `granularity`.
   *
   * <p>Does NOT check if analyzer config is enabled or not. Do not build schedules for disabled
   * analyzers.
   */
  private static PgMonitorSchedule.PgMonitorScheduleBuilder buildSchedule(
      Analyzer analyzer, Granularity granularity, ZonedDateTime currentTime) {
    val nextTargetBucket = analyzer.getSchedule().getInitialTargetBucket(currentTime, granularity);

    val interval =
        new Interval(
            nextTargetBucket.toInstant().toEpochMilli(),
            ComputeJobGranularities.add(nextTargetBucket, granularity, 1l)
                .toInstant()
                .toEpochMilli());
    val builder =
        PgMonitorSchedule.builder()
            .analyzerId(analyzer.getId())
            .targetBucket(nextTargetBucket)
            .analyzerConfig(MonitorConfigV3JsonSerde.toJson(Arrays.asList(analyzer)))
            .backfillInterval(interval.toString())
            .granularity(GranularityChronoUnitConverter.getDatasetGranularity(granularity))
            .eligableToRun(
                analyzer
                    .getSchedule()
                    .getNextFire(
                        nextTargetBucket, analyzer.getDataReadinessDuration(), granularity));
    return builder;
  }
}
