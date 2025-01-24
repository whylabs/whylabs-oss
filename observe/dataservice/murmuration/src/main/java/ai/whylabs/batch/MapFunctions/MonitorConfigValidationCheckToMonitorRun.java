package ai.whylabs.batch.MapFunctions;

import ai.whylabs.batch.udfs.PopulateCustomerRequestedBackfillFlag;
import ai.whylabs.core.configV3.structure.Analyzer;
import ai.whylabs.core.configV3.structure.MonitorConfigV3;
import ai.whylabs.core.configV3.structure.MonitorConfigV3Row;
import ai.whylabs.core.enums.MonitorRunStatus;
import ai.whylabs.core.granularity.TargetBatchDateCalculator;
import ai.whylabs.core.serde.MonitorConfigV3JsonSerde;
import ai.whylabs.core.structures.AnalyzerRun;
import ai.whylabs.core.structures.monitor.events.FailureType;
import ai.whylabs.core.validation.MonitorConfigValidationCheck;
import java.time.DayOfWeek;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Iterator;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import org.apache.spark.api.java.function.FlatMapFunction;

/** Run a bunch of validation checks against a config before we try to run it */
@AllArgsConstructor
@Slf4j
public class MonitorConfigValidationCheckToMonitorRun extends MonitorConfigValidationCheck
    implements FlatMapFunction<MonitorConfigV3Row, AnalyzerRun> {

  protected ZonedDateTime currentTime;
  protected String runId;
  protected Boolean forceLatestConfigVersion;

  // TODO: make the week origin configurable on a per model basis
  private static final DayOfWeek weekOrigin = DayOfWeek.MONDAY;

  @Override
  public Iterator<AnalyzerRun> call(MonitorConfigV3Row monitorConfigV3Row) {
    List<AnalyzerRun> errors = new ArrayList();
    MonitorConfigV3 config = null;
    try {
      config = MonitorConfigV3JsonSerde.parseMonitorConfigV3(monitorConfigV3Row);
    } catch (Exception e) {
      /**
       * Yeah we don't actually know the model granularity if the config can't be parsed so in that
       * case we'll create a failed monitor run record for every monitor run as if it was hourly
       */
      long targetBatchTimestamp = currentTime.minusHours(1).toInstant().toEpochMilli();
      errors.add(
          from(monitorConfigV3Row, targetBatchTimestamp)
              .internalErrorMessage(e.toString())
              .failureTypes(Arrays.asList(FailureType.InvalidJson))
              .build());
    }

    // Top level checks
    if (config != null) {
      for (val m : getOverallChecks()) {
        if (!m.test(config)) {
          errors.add(
              from(monitorConfigV3Row, currentTime.toInstant().toEpochMilli())
                  .failureTypes(Arrays.asList(m.getFailureType()))
                  .internalErrorMessage(m.getInternalErrorMessage())
                  .build());
          log.warn("Failed top level monitor config {}", config);
          return errors.iterator();
        }
      }

      // Analyzer level checks
      long targetBatchTimestamp =
          TargetBatchDateCalculator.getTargetbatchTimestamp(
              currentTime, config.getGranularity(), weekOrigin);

      for (Analyzer a : getActiveAnalyzers(config)) {
        // Analyzer's going to run, validate it
        for (val check : getAanalyzerChecks()) {
          if (!check.test(a)) {
            // TODO: Add analysis config version once that's avail
            errors.add(
                from(monitorConfigV3Row, targetBatchTimestamp)
                    .analyzerId(a.getId())
                    .analyzerVersion(a.getVersion())
                    .failureTypes(Arrays.asList(check.getFailureType()))
                    .monitorIds(getMonitorIdsForAnalyzer(config, a))
                    .internalErrorMessage(check.getInternalErrorMessage())
                    .build());
          }
        }
      }
    }

    return errors.iterator();
  }

  public static List<String> getMonitorIdsForAnalyzer(MonitorConfigV3 config, Analyzer analyzer) {
    List<String> monitorIds = new ArrayList<>();
    for (val m : config.getMonitors()) {
      if (m.getAnalyzerIds().contains(analyzer.getId())) {
        monitorIds.add(m.getId());
      }
    }
    return monitorIds;
  }

  private AnalyzerRun.AnalyzerRunBuilder from(
      MonitorConfigV3Row monitorConfigV3Row, long targetBatchTimestamp) {
    PopulateCustomerRequestedBackfillFlag backfillFlag =
        new PopulateCustomerRequestedBackfillFlag();

    return AnalyzerRun.builder()
        .runId(runId)
        .createdTs(System.currentTimeMillis())
        .orgId(monitorConfigV3Row.getOrgId())
        .datasetId(monitorConfigV3Row.getDatasetId())
        .startedTs(targetBatchTimestamp)
        .forceLatestConfigVersion(forceLatestConfigVersion)
        .completedTs(targetBatchTimestamp)
        .analyzerVersion(null)
        .status(MonitorRunStatus.FAILED)
        .customerRequestedBackfill(
            backfillFlag.call(monitorConfigV3Row.getOrgId(), monitorConfigV3Row.getDatasetId()));
  }
}
