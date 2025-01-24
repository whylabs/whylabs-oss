package ai.whylabs.dataservice.util;

import static ai.whylabs.dataservice.services.ProfileService.DEFAULT_PROMOTION_LOOKBACK_DAYS;

import ai.whylabs.dataservice.DataSvcConfig;
import ai.whylabs.dataservice.adhoc.AsyncRequestDispatcher;
import ai.whylabs.dataservice.cache.CacheService;
import ai.whylabs.dataservice.controllers.*;
import ai.whylabs.dataservice.services.*;
import io.micrometer.core.instrument.MeterRegistry;
import io.micronaut.context.annotation.Requires;
import io.micronaut.scheduling.annotation.Scheduled;
import io.micronaut.transaction.annotation.TransactionalAdvice;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.inject.Inject;
import jakarta.inject.Singleton;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.ZonedDateTime;
import java.util.stream.Collectors;
import javax.inject.Named;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import org.apache.commons.io.IOUtils;
import org.hibernate.query.internal.NativeQueryImpl;
import software.amazon.awssdk.regions.Region;

/**
 * manage some aspects of audit table.
 *
 * <p>a bit of a hack - we really want a singleton pod to run our scheduled maintenance tasks.
 * Restricting scheduled maintenance to `enableBackfill=true` is an effective way to achieve that.
 */
@Slf4j
@Tag(
    name = "ScheduledBackfillTasks",
    description = "schedule tasks that depend on enableBackfill property")
@RequiredArgsConstructor
@Singleton
@Requires(property = "whylabs.dataservice.enableBackfill", value = "true")
public class ScheduledBackfillTasks {

  @Inject private final ProfileService profileService;
  @Inject private AdminService adminService;

  @Inject private AnalysisController analysisController;
  @Inject private ProfileController profileController;
  @Inject private PreRenderController preRenderController;
  @Inject private final MeterRegistry meterRegistry;
  @Inject private AsyncAnalysisController asyncAnalysisController;
  @Inject private AsyncDeletionController asyncDeletionController;
  @Inject private GlobalStatusService globalStatusService;
  @Inject private PgMonitorScheduleService pgMonitorScheduleService;
  @Inject private AsyncRequestDispatcher asyncRequestDispatcher;

  @Inject private DataSvcConfig config;
  @Inject private CacheService cacheService;
  @Inject private OrganizationService organizationService;
  @Inject private final ColumnStatsService columnStatsService;
  @Inject private DatasetController datasetcontroller;

  @Named("awsAccountId")
  @Inject
  private final String awsAccountId;

  @Inject private final Region awsRegion;

  @PersistenceContext(name = DatasourceConstants.READONLY)
  private EntityManager roEntityManager;

  static final String staging_rows_query;

  static {
    try {
      staging_rows_query =
          IOUtils.resourceToString("/sql/staging_rows.sql", StandardCharsets.UTF_8);
    } catch (IOException e) {
      throw new RuntimeException(e);
    }
  }

  /**
   * Scan the audit table for rows in processing state with stale locks. All locks older than 30
   * minutes are considered stale.
   */
  @Scheduled(fixedDelay = "10m")
  @SuppressWarnings("unused")
  void auditReaper() {
    try {
      val n = profileService.auditReaper();
      log.debug("Reaped {} rows from audit table", n);
    } catch (Exception e) {
      log.error("Error reaping audit rows", e);
    }
  }

  /** report count of profiles in each state, ('pending', 'processing', 'ingested', 'failed') */
  @Scheduled(fixedDelay = "${whylabs.dataservice.auditMetricsPeriod}")
  @SuppressWarnings("unused")
  public void reportAuditStates() {
    try {
      val auditCounts = profileService.queryAuditStates();
      if (log.isDebugEnabled()) {
        String metricsString =
            auditCounts.entrySet().stream()
                .map(e -> e.getKey() + "=" + e.getValue())
                .collect(Collectors.joining(", ", "{", "}"));
        log.debug("audit state metrics: {}", metricsString);
      }
      for (val e : auditCounts.entrySet()) {
        meterRegistry.gauge(
            "whylabs.profileservice.audit." + e.getKey(), e.getValue().doubleValue());
      }

      val queueDepth = profileService.queryQueueDepth();
      if (log.isDebugEnabled()) {
        String metricsString =
            queueDepth.entrySet().stream()
                .map(e -> e.getKey() + "=" + e.getValue().toString())
                .collect(Collectors.joining(", ", "{", "}"));
        log.debug("queue depth metrics: {}", metricsString);
      }
      for (val e : queueDepth.entrySet()) {
        meterRegistry.gauge(
            "whylabs.profileservice.queue." + e.getKey(), e.getValue().doubleValue());
      }

    } catch (Exception e) {
      log.error("Error reporting audit states", e);
    }
  }

  /**
   * Periodically move data from staging tables to the hypertables
   *
   * <p>https://docs.google.com/presentation/d/14LkVfaivX9kycauoJ1vtc8JDO0a8mVFQDd0tsormmo0/edit#slide=id.g22b6f460dc8_0_0
   */
  @Scheduled(cron = "0 0 * * * ?", zoneId = "UTC")
  public void promote() {
    if (globalStatusService.isUsePgCronBasedFlows()) {
      return;
    }
    try {
      log.info("Promoting profile data from the staging table to historical hypertable");
      long s = System.currentTimeMillis();
      profileService.promoteHistoricalData(true, DEFAULT_PROMOTION_LOOKBACK_DAYS, true);
      meterRegistry.counter("whylabs.datapromotion.cronjob.success").increment();
      log.info("Promoting profile data took {}ms", System.currentTimeMillis() - s);
    } catch (Exception e) {
      meterRegistry.counter("whylabs.datapromotion.cronjob.failure").increment();
      log.error("Exception promoting data", e);
    }
  }

  @Scheduled(cron = "*/5 * * * * ?", zoneId = "UTC")
  public void rollupTagsTable() {
    try {
      profileService.rollupTagsTable();
    } catch (Exception e) {
      log.error("Exception rolling up tags table", e);
    }
  }

  /** Run data deletion async, top of the hour */
  @Scheduled(cron = "5 0 * * * ?", zoneId = "UTC")
  void deleteAnalysis() {
    try {
      analysisController.deleteAnalysisRunNow();
    } catch (Exception e) {
      log.error("Exception deleting analyzer results", e);
    }
  }

  /** Run data deletion async, top of the hour */
  @Scheduled(cron = "5 0 * * * ?", zoneId = "UTC")
  void deleteProfiles() {
    if (globalStatusService.isMaintenanceWindow()) {
      return;
    }
    try {
      profileController.deleteProfilesRunNow();
    } catch (Exception e) {
      log.error("Error deleting profiles", e);
    }
  }

  /**
   * If the service crashes or otherwise fails to remove the parquet snapshot downloaded to EFS,
   * this process will periodically clear out old snapshots so our EFS volume doesn't grow
   * endlessly.
   */
  @Scheduled(cron = "40 0 * * * ?", zoneId = "UTC")
  @SneakyThrows
  public void cleanupOldSnapshots() {
    // Purge old materialized tables
    try {
      adminService.purgeOldMaterializedTables();
    } catch (Exception e) {
      log.error("Failed to purge materialized tables", e);
    }
  }

  //  @Scheduled(cron = "0 0 * * * *", zoneId = "UTC")
  public void reingest() {
    String bucket = config.getCloudtrailBucket();
    String prefix = "profileUploads/AWSLogs/" + awsAccountId + "/CloudTrail/" + awsRegion + "/";

    try {
      log.info("Replaying CloudTrail data from s3://{}/{}", bucket, prefix);
      long s = System.currentTimeMillis();
      profileService.replay(bucket, prefix, ZonedDateTime.now());
      log.info("Replay CloudTrail data took {}ms", System.currentTimeMillis() - s);
    } catch (Exception e) {
      meterRegistry.counter("whylabs.cloudtrail.cronjob.failure").increment();
      log.error("Exception replaying cloudtrail data", e);
    }
  }

  @Scheduled(cron = "15 0 * * * ?", zoneId = "America/Los_Angeles")
  public void renderAllWideDatasets() {
    if (globalStatusService.isMaintenanceWindow()) {
      return;
    }

    preRenderController.renderAllLargeDatasets(1);
  }

  @Scheduled(cron = "20 0 * * * ?", zoneId = "UTC")
  public void dumpOrgTableToS3() {
    organizationService.dumpOrgTableToS3();
  }

  @Scheduled(fixedDelay = "1s")
  public void planQueries() {
    asyncAnalysisController.planQueries();
  }

  /**
   * Keep track of how many analyzer results were recently promoted and the size of the metric
   * staging tables. PG Row estimates look like this
   * +----------------------------------+------------+-----------+ |whylabs.profiles_overall_staging
   * |1000342 |86090604544| |whylabs.profiles_segmented_staging|190349 |26139934720|
   * +----------------------------------+------------+-----------+
   */
  @Scheduled(fixedDelay = "30m")
  @SuppressWarnings("unused")
  @TransactionalAdvice(DatasourceConstants.READONLY)
  void operationalMetrics() {
    try {
      val query = (NativeQueryImpl) roEntityManager.createNativeQuery(staging_rows_query);
      PostgresUtil.setStandardTimeout(query);
      val rows = query.getResultList();
      if (rows.size() > 2) {
        log.info("unexpected rows {} from staging_rows_query", rows.size());
      }
      for (int i = 0; i < rows.size(); i++) {
        val oa = (Object[]) rows.get(i);
        val table = (String) oa[0];
        val name = table.substring(table.lastIndexOf(".") + 1);
        meterRegistry.gauge("whylabs.postgres.rows." + name, ((Float) oa[1]).longValue());
      }
      log.info("posted {} operational metrics", rows.size());
    } catch (Exception e) {
      log.error("Error while collecting operational metrics", e);
    }
  }

  @Scheduled(fixedDelay = "10s")
  public void runPgBackedMonitor() {
    if (globalStatusService.monitorSchedulerEnabled()) {
      pgMonitorScheduleService.queueUpWork();
    }
  }

  @Scheduled(cron = "* * * * * ?", zoneId = "UTC")
  public void publishQueueDepthMetrics() {
    if (config.isEnableBackfill()) {
      asyncRequestDispatcher.publishQueueDepthMetrics();
    }
  }

  @Scheduled(fixedDelay = "1s")
  public void rollupColumnStats() {
    columnStatsService.rollupColumnStats();
  }

  @Scheduled(cron = "0 0 * * * ?", zoneId = "UTC")
  public void reapStuckRequests() {
    asyncRequestDispatcher.reapStuckRequests();
  }

  @Scheduled(fixedDelay = "15m")
  public void loopDatasets() {
    datasetcontroller.triggerDataLoop();
  }
}
