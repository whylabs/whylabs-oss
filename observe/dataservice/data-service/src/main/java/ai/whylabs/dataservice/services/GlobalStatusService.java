package ai.whylabs.dataservice.services;

import ai.whylabs.dataservice.enums.PostgresQueues;
import ai.whylabs.dataservice.enums.SystemStatus;
import ai.whylabs.dataservice.util.DatasourceConstants;
import io.micrometer.core.instrument.MeterRegistry;
import io.micronaut.context.annotation.Executable;
import io.micronaut.scheduling.annotation.Scheduled;
import io.micronaut.transaction.annotation.TransactionalAdvice;
import jakarta.inject.Inject;
import java.sql.Connection;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import javax.inject.Named;
import javax.inject.Singleton;
import javax.sql.DataSource;
import javax.transaction.Transactional;
import lombok.Cleanup;
import lombok.RequiredArgsConstructor;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import lombok.val;

@Slf4j
@Singleton
@RequiredArgsConstructor
public class GlobalStatusService {
  private boolean maintenanceWindow = false;
  private long maintenanceWindowLastCheck = 0l;
  private Boolean usePgCronBasedFlows = null;

  @Inject private final MeterRegistry meterRegistry;

  @Inject
  @Named(DatasourceConstants.READONLY)
  private DataSource dataSource;

  @Inject
  @Named(DatasourceConstants.BULK)
  private DataSource bulkDatasource;

  private static final Map<PostgresQueues, String> WORKER_COMMAND = new HashMap<>();
  private static final Map<PostgresQueues, String> WORKER_NAME = new HashMap<>();
  private static final Map<PostgresQueues, String> WORKER_SCHEDULE = new HashMap<>();

  static {
    WORKER_COMMAND.put(
        PostgresQueues.queue_data_promotions_bronze_to_silver,
        "select promoteBronzeToSilverWork()");
    WORKER_COMMAND.put(
        PostgresQueues.queue_data_promotions_silver_to_historical,
        "select promoteSilverToHistoricalWork()");
    WORKER_COMMAND.put(PostgresQueues.queue_timescale_compression, "select compressOldChunk()");

    WORKER_NAME.put(
        PostgresQueues.queue_data_promotions_bronze_to_silver, "bronze to silver promotion worker");
    WORKER_NAME.put(
        PostgresQueues.queue_data_promotions_silver_to_historical,
        "silver to historical promotion worker");
    WORKER_NAME.put(PostgresQueues.queue_timescale_compression, "timescale compression worker");

    WORKER_SCHEDULE.put(PostgresQueues.queue_data_promotions_bronze_to_silver, "2 seconds");
    WORKER_SCHEDULE.put(PostgresQueues.queue_data_promotions_silver_to_historical, "2 seconds");
    WORKER_SCHEDULE.put(PostgresQueues.queue_timescale_compression, "10 seconds");
  }

  @SneakyThrows
  @Transactional
  @TransactionalAdvice(DatasourceConstants.BULK)
  @Executable
  public void toggleMonitorScheduler(boolean enabled) {
    @Cleanup Connection db = bulkDatasource.getConnection();
    String q = "update  whylabs.global_system set monitor_scheduler_enabled = ?";
    @Cleanup val query = db.prepareStatement(q);
    query.setBoolean(1, enabled);
    query.executeUpdate();
  }

  @SneakyThrows
  @Transactional
  @TransactionalAdvice(DatasourceConstants.BULK)
  @Executable
  public void toggleMonitorWorkers(boolean enabled) {
    @Cleanup Connection db = bulkDatasource.getConnection();
    String q = "update  whylabs.global_system set monitor_work_dispatcher_enabled = ?";
    @Cleanup val query = db.prepareStatement(q);
    query.setBoolean(1, enabled);
    query.executeUpdate();
  }

  @SneakyThrows
  @Transactional
  @TransactionalAdvice(DatasourceConstants.READONLY)
  @Executable
  public boolean monitorSchedulerEnabled() {
    @Cleanup Connection db = dataSource.getConnection();
    String q = "select monitor_scheduler_enabled from whylabs.global_system limit 1";
    @Cleanup val query = db.prepareStatement(q);
    val r = query.executeQuery();
    r.next();
    return r.getBoolean(1);
  }

  @SneakyThrows
  @Transactional
  @TransactionalAdvice(DatasourceConstants.READONLY)
  @Executable
  public Integer getMonitorWorkerConcurrency() {
    @Cleanup Connection db = dataSource.getConnection();
    String q = "select monitor_worker_concurrency from whylabs.global_system limit 1";
    @Cleanup val query = db.prepareStatement(q);
    val r = query.executeQuery();
    r.next();
    return r.getInt(1);
  }

  @SneakyThrows
  @Transactional
  @TransactionalAdvice(DatasourceConstants.BULK)
  @Executable
  public void setMonitorWorkerConcurrency(Integer concurrency) {
    @Cleanup Connection db = bulkDatasource.getConnection();
    String q = "update  whylabs.global_system set monitor_worker_concurrency = ?";
    @Cleanup val query = db.prepareStatement(q);
    query.setLong(1, concurrency);
    query.executeUpdate();
  }

  @SneakyThrows
  @Transactional
  @TransactionalAdvice(DatasourceConstants.READONLY)
  @Executable
  public boolean monitorWorkerEnabled() {
    @Cleanup Connection db = dataSource.getConnection();
    String q = "select monitor_work_dispatcher_enabled from whylabs.global_system limit 1";
    @Cleanup val query = db.prepareStatement(q);
    val r = query.executeQuery();
    r.next();
    return r.getBoolean(1);
  }

  public boolean isMaintenanceWindowCached() {
    if (System.currentTimeMillis() - maintenanceWindowLastCheck > 5000) {
      maintenanceWindow = isMaintenanceWindow();
      maintenanceWindowLastCheck = System.currentTimeMillis();
    }
    return maintenanceWindow;
  }

  @SneakyThrows
  @Transactional
  @TransactionalAdvice(DatasourceConstants.BULK)
  @Executable
  public boolean isUsePgCronBasedFlows() {
    if (usePgCronBasedFlows == null) {
      @Cleanup Connection db = bulkDatasource.getConnection();
      String q = "select pg_cron_flow_enabled from whylabs.global_system limit 1";
      @Cleanup val query = db.prepareStatement(q);
      val r = query.executeQuery();
      r.next();
      usePgCronBasedFlows = r.getBoolean(1);
    }

    return usePgCronBasedFlows;
  }

  /**
   * Enable/disable the pg_cron backed data flows in realtime
   *
   * @param usePgCronBasedFlows
   */
  @SneakyThrows
  @Transactional
  @TransactionalAdvice(DatasourceConstants.BULK)
  @Executable
  public void setUsePgCronBasedFlows(boolean usePgCronBasedFlows) {
    // Note this flag isn't persistent (yet at least)
    this.usePgCronBasedFlows = usePgCronBasedFlows;

    @Cleanup Connection db = bulkDatasource.getConnection();
    String q = "update whylabs.global_system set pg_cron_flow_enabled = ?";
    @Cleanup val query = db.prepareStatement(q);
    query.setBoolean(1, usePgCronBasedFlows);
    query.execute();

    if (usePgCronBasedFlows) {
      // Every hour, 5 minute in bronze=>silver
      scheduleJob(
          "bronze to silver data promotion kicker",
          "5 * * * *",
          "select initiateBronzeToSilverDataPromotions()");

      // Every saturday at 3am silver=>historical
      scheduleJob(
          "silver=>historical data promotion kicker",
          "0 3 * * 6",
          "select initiateSilverToHistoricalDataPromotions()");

      // Poll promotion status every minute
      scheduleJob("poll promotion status", "* * * * *", "select pollPromotionStatus()");

      // Every saturday at 6am silver=>historical cause after 3 hours of promoting data, if its not
      // done we need to get back on course
      scheduleJob(
          "expire silver=>historical if taking too long",
          "0 8 * * 6",
          "select expireSilverToHistoricalPromotionJobs()");

      // Every 30s poll for compression status
      scheduleJob(
          "wait for timescaledb chunk recompression to finish to end the downtime window",
          "30 seconds",
          "select pollCompressionStatus()");

      for (int x = 0; x < 2; x++) {
        // Add some queue workers
        addQueueWorker(PostgresQueues.queue_timescale_compression);
        addQueueWorker(PostgresQueues.queue_data_promotions_bronze_to_silver);
        addQueueWorker(PostgresQueues.queue_data_promotions_silver_to_historical);
      }
    } else {
      // Unschedule everything
      String q2 = "SELECT cron.unschedule((select jobid from cron.job where command = ? limit 1) )";
      @Cleanup val query2 = db.prepareStatement(q2);

      query2.setString(1, "select initiateBronzeToSilverDataPromotions()");
      query2.execute();
      query2.setString(1, "select initiateSilverToHistoricalDataPromotions()");
      query2.execute();
      query2.setString(1, "select pollPromotionStatus()");
      query2.execute();
      query2.setString(1, "select expireSilverToHistoricalPromotionJobs()");
      query2.execute();
      query2.setString(1, "select pollCompressionStatus()");
      query2.execute();
      removeQueueWorker(PostgresQueues.queue_timescale_compression, 100);
      removeQueueWorker(PostgresQueues.queue_data_promotions_bronze_to_silver, 100);
      removeQueueWorker(PostgresQueues.queue_data_promotions_silver_to_historical, 100);
    }
  }

  @SneakyThrows
  @Transactional
  @TransactionalAdvice(DatasourceConstants.BULK)
  @Executable
  public void scheduleJob(String jobName, String schedule, String command) {
    @Cleanup Connection db = bulkDatasource.getConnection();
    String q = "SELECT cron.schedule(?, ?, ?)";
    @Cleanup val query = db.prepareStatement(q);
    query.setString(1, jobName);
    query.setString(2, schedule);
    query.setString(3, command);
    query.execute();
  }

  @SneakyThrows
  @Transactional
  @TransactionalAdvice(DatasourceConstants.READONLY)
  @Executable
  public boolean isMaintenanceWindow() {
    @Cleanup Connection db = dataSource.getConnection();

    String q = "select status from whylabs.global_system";
    @Cleanup val query = db.prepareStatement(q);
    query.execute();
    val resultSet = query.getResultSet();
    if (resultSet != null) {
      while (resultSet.next()) {
        String status = resultSet.getString(1);
        if (SystemStatus.valueOf(status) != SystemStatus.normal) {
          return true;
        }
      }
    }
    return false;
  }

  // Unit test only, normally triggered by pg_cron
  @SneakyThrows
  @Transactional
  @TransactionalAdvice(DatasourceConstants.BULK)
  @Executable
  public void pollCompressionStatus() {
    @Cleanup Connection db = bulkDatasource.getConnection();
    String q = "select pollCompressionStatus()";
    @Cleanup val query = db.prepareStatement(q);
    query.execute();
  }

  // Unit test only, normally triggered by pg_cron
  @SneakyThrows
  @Transactional
  @TransactionalAdvice(DatasourceConstants.BULK)
  @Executable
  public void pollPromotionStatus() {
    @Cleanup Connection db = bulkDatasource.getConnection();
    String q = "select pollPromotionStatus()";
    @Cleanup val query = db.prepareStatement(q);
    query.execute();
  }

  // Unit test only, normally triggered by pg_cron
  @SneakyThrows
  @Transactional
  @TransactionalAdvice(DatasourceConstants.BULK)
  @Executable
  public void initiateBronzeToSilverDataPromotions() {
    @Cleanup Connection db = bulkDatasource.getConnection();
    String q = "select initiateBronzeToSilverDataPromotions()";
    @Cleanup val query = db.prepareStatement(q);
    query.execute();
  }

  // Unit test only, normally triggered by pg_cron
  @SneakyThrows
  @Transactional
  @TransactionalAdvice(DatasourceConstants.BULK)
  @Executable
  public void initiateSilverToHistoricalDataPromotions() {
    @Cleanup Connection db = bulkDatasource.getConnection();
    String q = "select initiateSilverToHistoricalDataPromotions()";
    @Cleanup val query = db.prepareStatement(q);
    query.execute();
  }

  // Unit test only, normally triggered by pg_cron
  @SneakyThrows
  @Transactional
  @TransactionalAdvice(DatasourceConstants.BULK)
  @Executable
  public void promoteSilverToHistoricalWork() {
    @Cleanup Connection db = bulkDatasource.getConnection();
    String q = "select promoteSilverToHistoricalWork()";
    @Cleanup val query = db.prepareStatement(q);
    query.execute();
  }

  // Unit test only, normally triggered by pg_cron
  @SneakyThrows
  @Transactional
  @TransactionalAdvice(DatasourceConstants.BULK)
  @Executable
  public void promoteBronzeToSilverWork() {
    @Cleanup Connection db = bulkDatasource.getConnection();
    String q = "select promoteBronzeToSilverWork()";
    @Cleanup val query = db.prepareStatement(q);
    query.execute();
  }

  @SneakyThrows
  @Transactional
  @TransactionalAdvice(DatasourceConstants.BULK)
  @Executable
  public void cancelSilverToHistoricalWork() {
    @Cleanup Connection db = bulkDatasource.getConnection();
    String q = "select expireSilverToHistoricalPromotionJobs()";
    @Cleanup val query = db.prepareStatement(q);
    query.execute();

    @Cleanup val compress = db.prepareStatement("select compressOldChunk()");
    while (getQueueSize(PostgresQueues.queue_timescale_compression) > 0) {
      compress.execute();
    }
  }

  // Unit test only, normally triggered by pg_cron
  @SneakyThrows
  @Transactional
  @TransactionalAdvice(DatasourceConstants.BULK)
  @Executable
  public void compressOldChunk() {
    @Cleanup Connection db = bulkDatasource.getConnection();
    String q = "select compressOldChunk()";
    @Cleanup val query = db.prepareStatement(q);
    query.execute();
  }

  @SneakyThrows
  @Transactional
  @TransactionalAdvice(DatasourceConstants.BULK)
  @Executable
  public long getQueueSize(PostgresQueues queue) {
    @Cleanup Connection db = bulkDatasource.getConnection();
    String q = "select count(*) from whylabs." + queue.name();
    @Cleanup val query = db.prepareStatement(q);
    query.execute();
    val r = query.getResultSet();
    r.next();
    return r.getLong(1);
  }

  @SneakyThrows
  @Transactional
  @TransactionalAdvice(DatasourceConstants.BULK)
  @Executable
  public long countQueueWorkers(PostgresQueues queue) {
    @Cleanup Connection db = bulkDatasource.getConnection();
    String q = "select count(*) from cron.job where command = ? ";
    @Cleanup val query = db.prepareStatement(q);
    query.setString(1, WORKER_COMMAND.get(queue));
    query.execute();
    val r = query.getResultSet();
    r.next();
    return r.getLong(1);
  }

  @SneakyThrows
  @Transactional
  @TransactionalAdvice(DatasourceConstants.BULK)
  @Executable
  public long addQueueWorker(PostgresQueues queue) {
    long n = countQueueWorkers(queue) + 1;
    @Cleanup Connection db = bulkDatasource.getConnection();
    String q = "select cron.schedule(?, ?, ?)";
    @Cleanup val query = db.prepareStatement(q);
    query.setString(1, WORKER_NAME.get(queue) + " " + n);
    query.setString(2, WORKER_SCHEDULE.get(queue));
    query.setString(3, WORKER_COMMAND.get(queue));
    query.execute();
    return n;
  }

  @SneakyThrows
  @Transactional
  @TransactionalAdvice(DatasourceConstants.BULK)
  @Executable
  public long removeQueueWorker(PostgresQueues queue, long howMany) {
    @Cleanup Connection db = bulkDatasource.getConnection();
    String q = "select jobid from cron.job where command = ? limit ?";
    @Cleanup val query = db.prepareStatement(q);
    query.setString(1, WORKER_COMMAND.get(queue));
    query.setLong(2, howMany);
    query.execute();
    val r = query.getResultSet();
    if (r.next()) {
      long jobId = r.getLong(1);
      @Cleanup val del = db.prepareStatement("SELECT cron.unschedule(? )");
      del.setLong(1, jobId);
      del.execute();
    }
    return countQueueWorkers(queue);
  }

  // https://github.com/citusdata/pg_cron
  // TODO: enable/disable scheduling the initiators and flag for old vs new flow tied into old code
  // scheduling

  @Scheduled(cron = "30 * * * * ?", zoneId = "UTC")
  public void publishDatadogQueueMetrics() {
    meterRegistry
        .counter("whylabs.system." + PostgresQueues.queue_timescale_compression + ".size")
        .increment(getQueueSize(PostgresQueues.queue_timescale_compression));
    meterRegistry
        .counter(
            "whylabs.system." + PostgresQueues.queue_data_promotions_bronze_to_silver + ".size")
        .increment(getQueueSize(PostgresQueues.queue_data_promotions_bronze_to_silver));
    meterRegistry
        .counter(
            "whylabs.system." + PostgresQueues.queue_data_promotions_silver_to_historical + ".size")
        .increment(getQueueSize(PostgresQueues.queue_data_promotions_silver_to_historical));
    meterRegistry.gauge("whylabs.system.isMaintenanceWindow", 1);
  }

  /**
   * This kind of operation cleans up unused disk space. Vacuum is a weird one in that it can't be
   * ran transactionally so instead we generate commands to be ran manually on the cli.
   *
   * @return
   */
  @SneakyThrows
  @Transactional
  @TransactionalAdvice(DatasourceConstants.BULK)
  @Executable
  public List<String> vacuumOldData() {
    @Cleanup Connection db = bulkDatasource.getConnection();
    String q =
        "SELECT chunk_schema || '.' || chunk_name FROM timescaledb_information.chunks where range_end < now() - Interval '97 days' and hypertable_name = any('{profiles_overall_hypertable, profiles_segmented_hypertable}')";
    @Cleanup val query = db.prepareStatement(q);
    val r = query.executeQuery();
    List<String> queries = new ArrayList<>();
    while (r.next()) {
      queries.add("vacuum full " + r.getString(1));
    }
    return queries;
  }
}
