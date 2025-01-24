package ai.whylabs.dataservice.services;

import ai.whylabs.core.configV3.structure.EntitySchema;
import ai.whylabs.core.configV3.structure.enums.Granularity;
import ai.whylabs.core.granularity.ComputeJobGranularities;
import ai.whylabs.core.predicatesV3.inclusion.FeaturePredicate;
import ai.whylabs.core.serde.MonitorConfigV3JsonSerde;
import ai.whylabs.dataservice.requests.ColumnStatRequest;
import ai.whylabs.dataservice.requests.GetEntitySchemaRequest;
import ai.whylabs.dataservice.requests.SegmentTag;
import ai.whylabs.dataservice.responses.ColumnStat;
import ai.whylabs.dataservice.responses.ColumnStatsResponse;
import ai.whylabs.dataservice.util.DatasourceConstants;
import ai.whylabs.dataservice.util.NativeQueryHelper;
import com.vladmihalcea.hibernate.type.array.StringArrayType;
import io.micronaut.context.annotation.Executable;
import io.micronaut.data.annotation.Repository;
import io.micronaut.transaction.annotation.TransactionalAdvice;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.util.*;
import javax.inject.Inject;
import javax.inject.Named;
import javax.inject.Singleton;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.sql.DataSource;
import javax.transaction.Transactional;
import lombok.Cleanup;
import lombok.RequiredArgsConstructor;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import org.apache.commons.io.IOUtils;
import org.hibernate.query.internal.NativeQueryImpl;
import org.jetbrains.annotations.NotNull;
import org.joda.time.Interval;
import org.postgresql.jdbc.PgArray;

@Slf4j
@Singleton
@RequiredArgsConstructor
@Repository
public class ColumnStatsService {

  @Inject
  @Named(DatasourceConstants.BULK)
  private DataSource bulkDatasource;

  @PersistenceContext(name = DatasourceConstants.READONLY)
  private EntityManager roEntityManager;

  static final String columnStatUpsertSql;
  static final String columnStatRequestSql;

  @Inject private PgMonitorScheduleService pgMonitorScheduleService;
  @Inject private MonitorConfigService monitorConfigService;
  @Inject private EntitySchemaService entitySchemaService;

  static {
    try {
      columnStatUpsertSql =
          IOUtils.resourceToString("/sql/column-stats-upsert.sql", StandardCharsets.UTF_8);
      columnStatRequestSql =
          IOUtils.resourceToString(
                  "/sql/column-stats-ingestion-metrics.sql", StandardCharsets.UTF_8)
              .replace("?&", "\\?\\?&");
    } catch (IOException e) {
      throw new RuntimeException(e);
    }
  }

  @SneakyThrows
  @Transactional(rollbackOn = SQLException.class)
  @TransactionalAdvice(DatasourceConstants.BULK)
  @Executable
  public void rollupColumnStats() {
    @Cleanup Connection db = bulkDatasource.getConnection();
    @Cleanup PreparedStatement pst = db.prepareStatement(columnStatUpsertSql);
    val token = UUID.randomUUID();
    val r = pst.executeQuery();

    @Cleanup
    PreparedStatement insertPst =
        db.prepareStatement(
            "insert into whylabs.column_stats (org_id, dataset_id, column_name, earliest_ingest_timestamp, dataset_timestamp, segment_text, token)"
                + "   values(?, ?, ?, ?, ?, ?, ?)");
    // Insert new column stats, a trigger will prevent duplicate entries from inserting
    int numInserts = 0;
    while (r.next()) {
      String orgId = r.getString(1);
      String datasetId = r.getString(2);

      val conf = monitorConfigService.getMonitorConfigCached(orgId, datasetId);
      Granularity granularity = Granularity.hourly;
      if (conf != null) {
        granularity = conf.getGranularity();
      }
      List<String> cols = NativeQueryHelper.fromArray((PgArray) r.getObject(3));
      for (val col : cols) {
        val datasetTsRolledUp =
            ComputeJobGranularities.truncateTimestamp(
                r.getTimestamp(5).toInstant().toEpochMilli(), granularity);
        insertPst.setString(1, orgId);
        insertPst.setString(2, datasetId);
        insertPst.setString(3, col);
        insertPst.setTimestamp(4, r.getTimestamp(4));
        insertPst.setTimestamp(5, new Timestamp(datasetTsRolledUp));
        insertPst.setObject(6, r.getObject(6));
        insertPst.setObject(7, token);
        insertPst.addBatch();
      }
      numInserts += cols.size();
    }
    if (numInserts > 0) {
      insertPst.executeBatch();
    }

    // Grab all new rows that were inserted indicating a datapoint was filled in which was
    // previously missing
    @Cleanup
    PreparedStatement newDatapoints =
        db.prepareStatement(
            "select org_id, dataset_id, ARRAY_AGG(column_name)::text[] as column_names, min(earliest_ingest_timestamp) as earliest_ingest_timestamp, dataset_timestamp, segment_text from whylabs.column_stats where token = ?::uuid group by org_id, dataset_id, segment_text, dataset_timestamp");
    newDatapoints.setObject(1, token);
    val newDatapointsResult = newDatapoints.executeQuery();

    @Cleanup
    val backfill =
        db.prepareStatement(
            "insert into whylabs.adhoc_async_requests (org_id, dataset_id, status, destination, backfill_interval, created_timestamp, updated_timestamp, analyzers_configs, "
                + "run_id, eligable_to_run, num_attempts, analyzer_id, queue, columns, segment_list, include_overall_segment)  "
                + "values (?, ?, 'PENDING'::adhoc_async_status_enum, 'ANALYSIS_HYPERTABLES_PG'::adhoc_async_destination_enum, ?, now(), now(), ?, gen_random_uuid(), now(), 0, ?, 'backfill'::async_analysis_queue, ?, ?, ?)");

    while (newDatapointsResult.next()) {
      String orgId = newDatapointsResult.getString(1);
      String datasetId = newDatapointsResult.getString(2);
      val conf = monitorConfigService.getMonitorConfigCached(orgId, datasetId);
      List<String> columns = Arrays.asList((String[]) newDatapointsResult.getArray(3).getArray());
      if (conf == null
          || conf.getAnalyzers() == null
          || conf.getAnalyzers().isEmpty()
          || columns.size() == 0) {
        // No monitor conf, no backfill
        continue;
      }

      Timestamp earliestIngestTimestamp = newDatapointsResult.getTimestamp(4);
      Timestamp datasetTimestamp = newDatapointsResult.getTimestamp(5);
      String segmentText = newDatapointsResult.getString(6);

      /**
       * Queue up backfills. The recieving side of this queue does the analysis to determine which
       * analyzers should get backfills vs which datapoints fall within 'scheduled work'.
       */
      backfill.setString(1, orgId);
      backfill.setString(2, datasetId);
      GetEntitySchemaRequest entitySchemaRequest = new GetEntitySchemaRequest();
      entitySchemaRequest.setOrgId(orgId);
      entitySchemaRequest.setDatasetId(datasetId);
      entitySchemaRequest.setIncludeHidden(false);

      EntitySchema entitySchema = entitySchemaService.getWithCaching(entitySchemaRequest);

      val start =
          ComputeJobGranularities.truncateTimestamp(
              ZonedDateTime.ofInstant(
                  Instant.ofEpochMilli(datasetTimestamp.toInstant().toEpochMilli()),
                  ZoneOffset.UTC),
              conf.getGranularity());
      val end = ComputeJobGranularities.add(start, conf.getGranularity(), 1);
      val interval = new Interval(start.toInstant().toEpochMilli(), end.toInstant().toEpochMilli());
      backfill.setString(3, interval.toString());
      val featurePredicate = new FeaturePredicate();
      int batches = 0;
      val analyzerScheduledWorkCutoffs =
          pgMonitorScheduleService.getScheduledWorkCutoffs(orgId, datasetId);
      for (val a : conf.getAnalyzers()) {
        if (analyzerScheduledWorkCutoffs.containsKey(a.getId())
            && analyzerScheduledWorkCutoffs.get(a.getId()) <= interval.getStartMillis()) {
          // This work is set to be picked up by the scheduled flow
          if (conf.isAllowPartialTargetBatches()) {
            pgMonitorScheduleService.triggerPartialTargetBatch(orgId, datasetId, start, end);
          }

          continue;
        }
        List<String> columnsToAnalyze = new ArrayList<>();
        for (val column : columns) {
          if (entitySchema.getColumns().containsKey(column)
              && featurePredicate.test(a, entitySchema.getColumns().get(column), column, 1.0)) {
            columnsToAnalyze.add(column);
          }
        }

        if (columnsToAnalyze.size() > 0) {
          backfill.setString(4, MonitorConfigV3JsonSerde.toJson(Arrays.asList(a)));
          backfill.setString(5, a.getId());
          backfill.setObject(6, NativeQueryHelper.toArray(db, columnsToAnalyze));
          backfill.setString(7, segmentText);
          if (segmentText.equals("[]")) {
            backfill.setBoolean(8, true);
          } else {
            backfill.setBoolean(8, false);
          }

          backfill.addBatch();
          batches++;
        }
      }
      if (batches > 0) {
        backfill.executeBatch();
      }
    }
  }

  @SneakyThrows
  @NotNull
  @Transactional
  @TransactionalAdvice(DatasourceConstants.READONLY)
  public ColumnStatsResponse getColumnStats(ColumnStatRequest rqst) throws SQLException {
    //  Chooses between two different sql queries, depending on whether referenceID is set or not.
    // All queries include orgID, datasetID, and segment.

    final NativeQueryImpl query =
        (NativeQueryImpl) roEntityManager.createNativeQuery(columnStatRequestSql);
    val interval = rqst.getInterval();
    if (interval == null) {
      throw new IllegalArgumentException("interval must not be null");
    }
    query.setParameter("startTS", new Timestamp(interval.getStartMillis()));
    query.setParameter("endTS", new Timestamp(interval.getEndMillis()));

    val segment = Optional.ofNullable(rqst.getSegment()).orElse(new ArrayList<SegmentTag>());
    val segmentTags =
        segment.stream().map(s -> s.getKey() + "=" + s.getValue()).toArray(String[]::new);
    query.setParameter("orgId", rqst.getOrgId());
    query.setParameter("datasetId", rqst.getDatasetId());
    query.setParameter("segmentTags", segmentTags, StringArrayType.INSTANCE);
    query.setReadOnly(true);

    val r = query.getResultList();
    Map<String, ColumnStat> columnStatMap = new HashMap<>();
    for (val e : r) {
      val arr = (Object[]) e;
      if (arr[0] == null) {
        continue;
      }

      columnStatMap.put(
          (String) arr[0],
          ColumnStat.builder()
              .earliestIngestTimestamp(fromObject(arr[1]))
              .earliestDatasetTimestamp(fromObject(arr[2]))
              .greatestDatasetTimestamp(fromObject(arr[3]))
              .uploadLagP50m(((Double) arr[4]).longValue())
              .uploadLagP95m(((Double) arr[5]).longValue())
              .uploadLagP99m(((Double) arr[6]).longValue())
              .build());
    }
    return ColumnStatsResponse.builder().columnStatMap(columnStatMap).build();
  }

  private ZonedDateTime fromObject(Object o) {
    if (o == null) {
      return null;
    }
    return ZonedDateTime.ofInstant(
        Instant.ofEpochMilli(((Timestamp) o).toInstant().toEpochMilli()), ZoneOffset.UTC);
  }
}
