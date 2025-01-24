package ai.whylabs.dataservice.services;

import ai.whylabs.adhoc.structures.ColumnStasticKey;
import ai.whylabs.adhoc.structures.SegmentStasticKey;
import ai.whylabs.batch.MapFunctions.DigestModeAnomalyFilter;
import ai.whylabs.core.configV3.structure.DigestMode;
import ai.whylabs.core.configV3.structure.Monitor;
import ai.whylabs.core.predicatesV3.inclusion.AnomalyFilterPredicate;
import ai.whylabs.core.serde.MonitorConfigV3JsonSerde;
import ai.whylabs.core.structures.ColumnStatistic;
import ai.whylabs.core.structures.SegmentStatistic;
import ai.whylabs.core.structures.SirenDigestPayload;
import ai.whylabs.core.structures.SirenEveryAnomalyPayload;
import ai.whylabs.core.structures.monitor.events.AnalyzerResult;
import ai.whylabs.dataservice.DataSvcConfig;
import ai.whylabs.dataservice.requests.AckDigestRequest;
import ai.whylabs.dataservice.requests.GetAnalyzerResultRequest;
import ai.whylabs.dataservice.sinks.SirenSqsSink;
import ai.whylabs.dataservice.util.DatasourceConstants;
import com.google.common.collect.ArrayListMultimap;
import com.google.common.collect.Multimap;
import io.micrometer.core.instrument.MeterRegistry;
import io.micronaut.data.jdbc.annotation.JdbcRepository;
import io.micronaut.data.model.query.builder.sql.Dialect;
import io.micronaut.transaction.annotation.TransactionalAdvice;
import jakarta.inject.Inject;
import jakarta.inject.Named;
import jakarta.inject.Singleton;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.util.*;
import java.util.stream.Collectors;
import javax.sql.DataSource;
import javax.transaction.Transactional;
import lombok.*;
import lombok.extern.slf4j.Slf4j;
import org.joda.time.Instant;
import org.joda.time.Interval;

/**
 * Responsible for managing postgres table of notifications in whylabs.digests_immediate, and
 * eventually whylabs.digests_scheduled...
 */
@Slf4j
@Singleton
@RequiredArgsConstructor
@JdbcRepository(dialect = Dialect.POSTGRES)
public class NotificationService {
  @Inject
  @Named(DatasourceConstants.BULK)
  private DataSource bulkDatasource;

  @Inject private final MeterRegistry meterRegistry;

  @Inject
  @Named(DatasourceConstants.READONLY)
  private DataSource roDatasource;

  @Inject private AnalysisService analysisService;

  @Inject private SirenSqsSink sirenDigestSink;

  @Inject private MonitorConfigService monitorConfigService;

  @Inject private DataSvcConfig config;

  @SneakyThrows
  @Transactional(rollbackOn = SQLException.class)
  @TransactionalAdvice(DatasourceConstants.BULK)
  public int persistImmediateDigest(SirenDigestPayload digest, Monitor monitor) {
    String sql =
        "INSERT INTO whylabs.digests_immediate"
            + "  (org_id, dataset_id, monitor_id, run_id, config, created_timestamp, payload) "
            + " VALUES "
            + "(?, ?, ?, ?, ?, now(), ?)";
    @Cleanup Connection db = bulkDatasource.getConnection();
    @Cleanup PreparedStatement pst = db.prepareStatement(sql);
    pst.setString(1, digest.getOrgId());
    pst.setString(2, digest.getDatasetId());
    pst.setString(3, digest.getMonitorId());
    pst.setString(4, digest.getRunId());
    val monitorJson = MonitorConfigV3JsonSerde.MAPPER.get().writeValueAsString(monitor);
    pst.setString(5, monitorJson);
    val payload = MonitorConfigV3JsonSerde.MAPPER.get().writeValueAsString(digest);
    pst.setString(6, payload);
    return pst.executeUpdate();
  }

  @SneakyThrows
  @Transactional(rollbackOn = SQLException.class)
  @TransactionalAdvice(DatasourceConstants.BULK)
  public int ackImmediateDigest(AckDigestRequest rqst) {
    String sql =
        "UPDATE whylabs.digests_immediate"
            + " set sent_timestamp = cast(? as timestamp) at time zone 'UTC'"
            + "where org_id=? and dataset_id=?"
            + "and run_id=? and monitor_id=?";
    @Cleanup Connection db = bulkDatasource.getConnection();
    @Cleanup PreparedStatement pst = db.prepareStatement(sql);
    pst.setTimestamp(1, new Timestamp(rqst.getSentTimestamp().getMillis()));
    pst.setString(2, rqst.getOrgId());
    pst.setString(3, rqst.getDatasetId());
    pst.setString(4, rqst.getRunId());
    pst.setString(5, rqst.getMonitorId());
    return pst.executeUpdate();
  }

  /**
   * Create AND SEND immediate digests, according to monitor config.
   *
   * <p>Fetches analyzer results from Postgres over supplied interval, possibly modified by
   * DigestMode.datasetTimestampOffset and other filtering options ni the monitor config.
   *
   * <p>Records digest in Postgres table whylabs.digests_immediate.
   */
  public void sendDigest(
      String org_id, String dataset_id, Monitor monitor, String run_id, Interval interval) {
    // fetch analyzer results from PG
    val analyzerResults = fetchAnalyzerResults(org_id, dataset_id, run_id, monitor, interval);
    SirenDigestPayload digest =
        buildDigestPayload(org_id, dataset_id, run_id, monitor, analyzerResults);
    if (digest != null) {
      persistImmediateDigest(digest, monitor);

      sirenDigestSink.send(config.getSirenNotificationTopic(), digest);
    }
  }

  public void sendEveryAnomaly(
      String org_id, String dataset_id, Monitor monitor, String runId, Interval interval) {
    // fetch analyzer results from PG
    val analyzerResults = fetchAnalyzerResults(org_id, dataset_id, runId, monitor, interval);

    int severity = DigestModeAnomalyFilter.DEFAULT_SEVERITY;
    if (monitor.getSeverity() != null) {
      severity = monitor.getSeverity();
    }
    for (val analyzerResult : analyzerResults) {
      if (analyzerResult.getAnomalyCount() == 0) continue;
      val anomalyMsg =
          SirenEveryAnomalyPayload.builder()
              .id(UUID.randomUUID().toString())
              .mode(SirenEveryAnomalyPayload.EVERY_ANOMALY)
              .analyzerResult(analyzerResult)
              .severity(severity)
              .monitorId(monitor.getId())
              .runId(runId)
              .orgId(org_id)
              .build();
      sirenDigestSink.send(config.getSirenNotificationTopic(), anomalyMsg);
    }
  }

  @SneakyThrows
  public SirenDigestPayload buildDigestPayload(
      String orgId,
      String datasetId,
      String runId,
      Monitor monitor,
      List<AnalyzerResult> analyzerResults) {
    // filter by runid, monitor_id, potentially interval
    val anomalyFilterPredicate = new AnomalyFilterPredicate();
    val filteredResults =
        analyzerResults.stream()
            .filter(a -> anomalyFilterPredicate.test(monitor, a))
            .collect(Collectors.toList());
    if (filteredResults.size() == 0) return null;

    // collect statistics about the results that will be included in the digest.
    StatsCollector stats = new StatsCollector();
    filteredResults.forEach(a -> stats.accumulate(a));

    // Build a digest payload
    // Take a sample prioritizing most recent
    Collections.reverse(analyzerResults);
    val sample = filteredResults.subList(0, Math.min(100, filteredResults.size()));

    return SirenDigestPayload.builder()
        .id(UUID.randomUUID().toString())
        .orgId(orgId)
        .numAnomalies(stats.numAnomalies)
        .totalWeight(stats.totalWeight)
        .datasetId(datasetId)
        .monitorId(monitor.getId())
        .earliestAnomalyDatasetTimestamp(stats.earliestAnomalyDatasetTimestamp)
        .oldestAnomalyDatasetTimestamp(stats.oldestAnomalyDatasetTimestamp)
        .segmentStatistics(stats.getSegmentStatistics())
        .columnStatistics(stats.getColumnStatistics())
        .anomalySample(sample)
        .severity(monitor.getSeverity())
        .mode(SirenDigestPayload.DIGEST)
        .runId(runId)
        .build();
  }

  /** fetch analyzer results for digests and everyAnomaly notifications. */
  private List<AnalyzerResult> fetchAnalyzerResults(
      String orgId, String datasetId, String runId, Monitor monitor, Interval interval) {

    val req = new GetAnalyzerResultRequest();
    req.setOrgId(orgId);
    req.setDatasetIds(Arrays.asList(datasetId));
    req.setAnalyzerIds(monitor.getAnalyzerIds());
    req.setMonitorIds(Arrays.asList(monitor.getId()));
    req.setRunIds(Arrays.asList(runId));
    req.setReadPgMonitor(true); // Read analysis generated by the PG backed monitors
    req.setAdhoc(false);
    req.setOnlyAnomalies(true);
    req.setIncludeFailures(false);
    req.setIncludeUnhelpful(false);

    // How far back the lookback period is for this digest
    Instant start = interval.getStart().toInstant();

    if (monitor.getMode().getClass().isAssignableFrom(DigestMode.class)
        && ((DigestMode) monitor.getMode()).getDatasetTimestampOffset() != null) {
      DigestMode digestMode = (DigestMode) monitor.getMode();
      start =
          interval
              .getEnd()
              .toInstant()
              .minus(digestMode.getDatasetTimestampOffsetParsed().toMillis());
      req.setInterval(new Interval(start, interval.getEnd()));
    } else {
      req.setInterval(interval);
    }

    val results = analysisService.getAnalyzerResults(req);
    if (results != null) {
      return results.stream().map(a -> AnalyzerResult.to(a)).collect(Collectors.toList());
    }
    return null;
  }

  @NoArgsConstructor
  public class StatsCollector {
    long numAnomalies = 0;
    Long oldestAnomalyDatasetTimestamp = Long.MIN_VALUE;
    Long earliestAnomalyDatasetTimestamp = Long.MAX_VALUE;
    Double totalWeight = null;
    Multimap<SegmentStasticKey, SegmentStatistic> segmentStatistics = ArrayListMultimap.create();
    Multimap<ColumnStasticKey, ColumnStatistic> columnStatistics = ArrayListMultimap.create();

    void accumulate(AnalyzerResult analyzerResult) {
      // Top level stats
      numAnomalies += analyzerResult.getAnomalyCount();
      if (analyzerResult.getDatasetTimestamp() > oldestAnomalyDatasetTimestamp) {
        oldestAnomalyDatasetTimestamp = analyzerResult.getDatasetTimestamp();
      }
      if (analyzerResult.getDatasetTimestamp() < earliestAnomalyDatasetTimestamp) {
        earliestAnomalyDatasetTimestamp = analyzerResult.getDatasetTimestamp();
      }
      if (analyzerResult.getSegmentWeight() != null) {
        // Do not conflate zero and null with weights. Null weight is a valid state.
        if (totalWeight == null) {
          totalWeight = analyzerResult.getSegmentWeight();
        } else {
          totalWeight += analyzerResult.getSegmentWeight();
        }
      }

      // Segment Stats
      val ssk =
          SegmentStasticKey.builder()
              .segment(analyzerResult.getSegment())
              .analyzerType(analyzerResult.getAnalyzerType())
              .build();
      val ss =
          SegmentStatistic.builder()
              .columns(Arrays.asList(analyzerResult.getColumn()))
              .segment(analyzerResult.getSegment())
              .analyzerType(analyzerResult.getAnalyzerType())
              .numAnomalies(analyzerResult.getAnomalyCount())
              .earliestAnomalyDatasetTimestamp(analyzerResult.getDatasetTimestamp())
              .oldestAnomalyDatasetTimestamp(analyzerResult.getDatasetTimestamp())
              .build();
      segmentStatistics.put(ssk, ss);

      // Column Stats
      val ck =
          ColumnStasticKey.builder()
              .column(analyzerResult.getColumn())
              .analyzerType(analyzerResult.getAnalyzerType())
              .build();
      val cs =
          ColumnStatistic.builder()
              .analyzerType(analyzerResult.getAnalyzerType())
              .column(analyzerResult.getColumn())
              .numAnomalies(analyzerResult.getAnomalyCount())
              .earliestAnomalyDatasetTimestamp(analyzerResult.getDatasetTimestamp())
              .oldestAnomalyDatasetTimestamp(analyzerResult.getDatasetTimestamp())
              .build();
      columnStatistics.put(ck, cs);
    }

    List<SegmentStatistic> getSegmentStatistics() {
      List<SegmentStatistic> segmentStatisticsMerged = new ArrayList<>();

      // Merge segment stats
      for (val key : segmentStatistics.keySet()) {
        final Collection<SegmentStatistic> e = segmentStatistics.get(key);
        final SegmentStatistic m = SegmentStatistic.merge(e);
        segmentStatisticsMerged.add(m);
      }
      return segmentStatisticsMerged;
    }

    List<ColumnStatistic> getColumnStatistics() {
      List<ColumnStatistic> columnStatisticsMerged = new ArrayList<>();

      // Merge segment stats
      for (val key : columnStatistics.keySet()) {
        columnStatisticsMerged.add(ColumnStatistic.merge(columnStatistics.get(key)));
      }
      return columnStatisticsMerged;
    }
  }
}
