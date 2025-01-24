package ai.whylabs.dataservice.services;

import ai.whylabs.core.configV3.structure.Analyzer;
import ai.whylabs.core.configV3.structure.MonitorConfigV3;
import ai.whylabs.core.configV3.structure.enums.Granularity;
import ai.whylabs.core.enums.ExtendedChronoUnit;
import ai.whylabs.core.granularity.ComputeJobGranularities;
import ai.whylabs.core.granularity.GranularityChronoUnitConverter;
import ai.whylabs.core.serde.MonitorConfigV3JsonSerde;
import ai.whylabs.dataservice.adhoc.StatusEnum;
import ai.whylabs.dataservice.requests.RewindScheduleRequest;
import ai.whylabs.dataservice.structures.PgMonitorSchedule;
import ai.whylabs.dataservice.util.DatasourceConstants;
import ai.whylabs.dataservice.util.MonitorConfigUtil;
import io.micronaut.context.annotation.Executable;
import io.micronaut.transaction.annotation.TransactionalAdvice;
import jakarta.inject.Singleton;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.sql.Types;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.util.*;
import javax.inject.Inject;
import javax.inject.Named;
import javax.sql.DataSource;
import javax.transaction.Transactional;
import lombok.Cleanup;
import lombok.RequiredArgsConstructor;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import org.apache.commons.io.IOUtils;
import org.joda.time.Interval;

@Slf4j
@Singleton
@RequiredArgsConstructor
public class PgMonitorScheduleService {

  @Inject MonitorConfigService monitorConfigService;

  private static String enqueueWorkSql;

  static {
    try {

      enqueueWorkSql =
          IOUtils.resourceToString(
                  "/sql/pg-monitor-enqueue-scheduled-work.sql", StandardCharsets.UTF_8)
              .replace("?&", "\\?\\?&");
    } catch (IOException e) {
      throw new RuntimeException(e);
    }
  }

  @Inject
  @Named(DatasourceConstants.BULK)
  private DataSource bulkDatasource;

  /**
   * The scheduler will retry tasks waiting for data to show up and time always moves fowards. This
   * method gives you a cutoff timestamp for each analyzer for which data will never by analyzed via
   * the scheduled flow. TLDR; Was this data uploaded too late to be analyzed justifying a backfill
   * request?
   *
   * @param orgId
   * @param datasetId
   * @return
   */
  @SneakyThrows
  @Transactional(rollbackOn = SQLException.class)
  @TransactionalAdvice(DatasourceConstants.BULK)
  @Executable
  public Map<String, Long> getScheduledWorkCutoffs(String orgId, String datasetId) {
    long start = System.currentTimeMillis();
    int c = 0;
    Map<String, Long> cutoffs = new HashMap<>();
    try (Connection db = bulkDatasource.getConnection()) {
      @Cleanup
      val st =
          db.prepareStatement(
              "select target_bucket, analyzer_id from whylabs.pg_monitor_schedule where org_id = ? and dataset_id = ?");
      st.setString(1, orgId);
      st.setString(2, datasetId);
      val r = st.executeQuery();
      while (r.next()) {
        cutoffs.put(r.getString(2), r.getTimestamp(1).toInstant().toEpochMilli());
      }
    }
    return cutoffs;
  }

  /**
   * Partial target batch support means we trigger the analysis as soon as some data shows up. This
   * is often used on monthly models where data gets uploaded on say the 12th and we don't want to
   * wait until the end of the month [for the target batch to conclude] before triggering analysis.
   */
  @SneakyThrows
  @Transactional(rollbackOn = SQLException.class)
  @TransactionalAdvice(DatasourceConstants.BULK)
  @Executable
  public void triggerPartialTargetBatch(
      String orgId, String datasetId, ZonedDateTime start, ZonedDateTime end) {
    try (Connection db = bulkDatasource.getConnection()) {
      @Cleanup
      val st =
          db.prepareStatement(
              "update whylabs.pg_monitor_schedule set eligable_to_run = target_bucket where org_id = ? and dataset_id = ? and target_bucket <= ? and target_bucket < ?");
      st.setString(1, orgId);
      st.setString(2, datasetId);
      st.setTimestamp(3, new Timestamp(start.toInstant().toEpochMilli()));
      st.setTimestamp(4, new Timestamp(end.toInstant().toEpochMilli()));
      val r = st.executeUpdate();
    }
  }

  /**
   * 1) Grab analyzers from the pg_monitor_schedule table that are ready to be analyzed 2) Stick
   * entries into adhoc_async_requests for each one 3) Progress the schedules to the next target
   * date
   */
  @SneakyThrows
  @Transactional(rollbackOn = SQLException.class)
  @TransactionalAdvice(DatasourceConstants.BULK)
  @Executable
  public void queueUpWork() {
    long start = System.currentTimeMillis();
    int c = 0;
    try (Connection db = bulkDatasource.getConnection()) {
      @Cleanup val st = db.prepareStatement(enqueueWorkSql);
      val r = st.executeQuery();
      @Cleanup
      val updateNextRun =
          db.prepareStatement(
              "update whylabs.pg_monitor_schedule set target_bucket = ?, eligable_to_run = ?, backfill_interval = ?, num_schedule_advances = num_schedule_advances + 1 where id = ?");

      while (r.next()) {
        c++;
        Long id = r.getLong(1);
        Analyzer analyzer = MonitorConfigV3JsonSerde.parseAnalyzerList(r.getString(2))[0];
        val targetBucket = ZonedDateTime.ofInstant(r.getTimestamp(3).toInstant(), ZoneOffset.UTC);
        Granularity granularity =
            GranularityChronoUnitConverter.getGranularity(
                ExtendedChronoUnit.valueOf(r.getString(4)));

        val nextTargetBucket = analyzer.getSchedule().getNextTargetBucket(targetBucket);
        val nextFire =
            analyzer
                .getSchedule()
                .getNextFire(nextTargetBucket, analyzer.getDataReadinessDuration(), granularity);
        val interval =
            new Interval(
                nextTargetBucket.toInstant().toEpochMilli(),
                ComputeJobGranularities.add(nextTargetBucket, granularity, 1l)
                    .toInstant()
                    .toEpochMilli());

        updateNextRun.setTimestamp(1, new Timestamp(nextTargetBucket.toInstant().toEpochMilli()));
        updateNextRun.setTimestamp(2, new Timestamp(nextFire.toInstant().toEpochMilli()));
        updateNextRun.setString(3, interval.toString());
        updateNextRun.setLong(4, id);
        updateNextRun.addBatch();
      }
      updateNextRun.executeBatch();
    }
    log.info(
        "Advanced the schedules for {} analyzers took {}ms", c, System.currentTimeMillis() - start);
  }

  /**
   * Unit test only, not part of normal flow. This endpoint lets you shift a schedule's target
   * bucket back to an older timestamp to make it easier to write unit tests.
   */
  @SneakyThrows
  @Transactional(rollbackOn = SQLException.class)
  @TransactionalAdvice(DatasourceConstants.BULK)
  @Executable
  public void rewindSchedule(RewindScheduleRequest rqst) {
    try (Connection db = bulkDatasource.getConnection()) {
      val st =
          db.prepareStatement(
              "update whylabs.pg_monitor_schedule set target_bucket = ?, backfill_interval = ?, eligable_to_run = ? where org_id = ? and dataset_id = ?");
      val targetBucket = ZonedDateTime.parse(rqst.getTimestamp());
      val conf =
          MonitorConfigV3JsonSerde.parseMonitorConfigV3(
              monitorConfigService.getLatest(rqst.getOrgId(), rqst.getDatasetId()).get());
      val interval =
          new Interval(
              targetBucket.toInstant().toEpochMilli(),
              ComputeJobGranularities.add(targetBucket, conf.getGranularity(), 1)
                  .toInstant()
                  .toEpochMilli());
      st.setTimestamp(1, new Timestamp(targetBucket.toInstant().toEpochMilli()));
      st.setString(2, interval.toString());
      st.setTimestamp(3, new Timestamp(interval.getEnd().toDateTime().toInstant().getMillis()));
      st.setString(4, rqst.getOrgId());
      st.setString(5, rqst.getDatasetId());
      st.executeUpdate();
    }
  }

  @SneakyThrows
  @Transactional(rollbackOn = SQLException.class)
  @TransactionalAdvice(DatasourceConstants.BULK)
  @Executable
  public void clearSchedules() {
    try (Connection db = bulkDatasource.getConnection()) {
      @Cleanup val st = db.prepareStatement("truncate whylabs.pg_monitor_schedule");
      st.executeUpdate();
    }
  }

  /**
   * When we update monitor configs we need to update all the schedules
   *
   * @param old
   * @param updated
   */
  @SneakyThrows
  @Transactional(rollbackOn = SQLException.class)
  @TransactionalAdvice(DatasourceConstants.BULK)
  @Executable
  public void updateSchedules(
      MonitorConfigV3 old, MonitorConfigV3 updated, ZonedDateTime backdate) {
    List<PgMonitorSchedule> newSchedules = null;
    if (backdate == null) {
      newSchedules = MonitorConfigUtil.convertToSchedules(updated);
    } else {
      newSchedules = MonitorConfigUtil.convertToSchedules(updated, backdate);
    }

    // TBD if the upsert logic is what we want, niche problem as analyzer schedules rarely shift
    String sql =
        "insert into whylabs.pg_monitor_schedule (org_id, dataset_id, eligable_to_run, analyzer_id, target_bucket, backfill_interval, analyzer_config, last_updated, granularity, analyzer_type, monitor_id) values (?, ?, ?, ?, ?, ?, ?, now(), ?::granularity_enum, ?, ?) ON CONFLICT (org_id, dataset_id, analyzer_id) DO UPDATE set analyzer_type = excluded.analyzer_type, monitor_id = excluded.monitor_id, eligable_to_run = LEAST(whylabs.pg_monitor_schedule.eligable_to_run, excluded.eligable_to_run), analyzer_config = excluded.analyzer_config";
    try (Connection db = bulkDatasource.getConnection()) {
      val st = db.prepareStatement(sql);

      long start = System.currentTimeMillis();
      for (val schedule : newSchedules) {
        st.setString(1, updated.getOrgId());
        st.setString(2, updated.getDatasetId());
        st.setTimestamp(3, new Timestamp(schedule.getEligableToRun().toInstant().toEpochMilli()));
        st.setString(4, schedule.getAnalyzerId());
        st.setTimestamp(5, new Timestamp(schedule.getTargetBucket().toInstant().toEpochMilli()));
        st.setString(6, schedule.getBackfillInterval());
        st.setString(7, schedule.getAnalyzerConfig());
        st.setString(8, schedule.getGranularity().name());
        st.setString(9, schedule.getAnalyzerType());
        st.setObject(10, schedule.getMonitorId(), Types.VARCHAR);
        st.addBatch();
      }
      if (newSchedules.size() > 0) {
        log.info(
            "Updated {} monitor schedules in {} org {} dataset {}",
            newSchedules.size(),
            System.currentTimeMillis() - start,
            updated.getOrgId(),
            updated.getDatasetId());
      }

      st.executeBatch();
    }
    if (old != null) {
      try (Connection db = bulkDatasource.getConnection()) {
        val st =
            db.prepareStatement(
                "delete from whylabs.pg_monitor_schedule where org_id = ? and dataset_id = ? and analyzer_id = ?");
        int c = 0;
        for (val remove : MonitorConfigUtil.getRemovedAnalyzerIds(old, updated)) {
          st.setString(1, updated.getOrgId());
          st.setString(2, updated.getDatasetId());
          st.setString(3, remove.toString());
          st.addBatch();
          c++;
        }
        log.info("Cleared out {} deleted analyzer schedules", c);
        st.executeBatch();
      }
    }
  }

  @SneakyThrows
  @Transactional(rollbackOn = SQLException.class)
  @TransactionalAdvice(DatasourceConstants.BULK)
  @Executable
  public void clear(String orgId, String datasetId) {
    List<PgMonitorSchedule> schedules = new ArrayList<>();

    try (Connection db = bulkDatasource.getConnection()) {
      val st =
          db.prepareStatement(
              "delete from whylabs.pg_monitor_schedule where org_id = ? and dataset_id = ?");
      st.setString(1, orgId);
      st.setString(2, datasetId);
      val r = st.executeUpdate();
    }
  }

  @SneakyThrows
  @Transactional(rollbackOn = SQLException.class)
  @TransactionalAdvice(DatasourceConstants.BULK)
  @Executable
  public List<PgMonitorSchedule> listSchedules(String orgId, String datasetId) {
    List<PgMonitorSchedule> schedules = new ArrayList<>();

    try (Connection db = bulkDatasource.getConnection()) {
      val st =
          db.prepareStatement(
              "select id, org_id, dataset_id, eligable_to_run, analyzer_id, target_bucket, analyzer_config, last_status, last_updated, granularity, backfill_interval from whylabs.pg_monitor_schedule where org_id = ? and dataset_id = ?");
      st.setString(1, orgId);
      st.setString(2, datasetId);
      val r = st.executeQuery();

      while (r.next()) {
        val b =
            PgMonitorSchedule.builder()
                .id(r.getLong(1))
                .orgId(r.getString(2))
                .datasetId(r.getString(3))
                .eligableToRun(
                    ZonedDateTime.ofInstant(
                        Instant.ofEpochMilli(r.getTimestamp(4).toInstant().toEpochMilli()),
                        ZoneOffset.UTC))
                .analyzerId(r.getString(5))
                .targetBucket(
                    ZonedDateTime.ofInstant(
                        Instant.ofEpochMilli(r.getTimestamp(6).toInstant().toEpochMilli()),
                        ZoneOffset.UTC))
                .analyzerConfig(r.getString(7))
                .lastUpdated(
                    ZonedDateTime.ofInstant(
                        Instant.ofEpochMilli(r.getTimestamp(9).toInstant().toEpochMilli()),
                        ZoneOffset.UTC));
        if (r.getString(8) != null) {
          b.lastStatus(StatusEnum.valueOf(r.getString(8)));
        }
        b.granularity(ExtendedChronoUnit.valueOf(r.getString(10)));
        b.backfillInterval(r.getString(11));

        schedules.add(b.build());
      }
    }
    return schedules;
  }
}
