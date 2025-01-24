package ai.whylabs.dataservice.services;

import static ai.whylabs.dataservice.controllers.BulkLoadController.materializedViewName;

import ai.whylabs.core.enums.PostgresBulkIngestionMode;
import ai.whylabs.core.structures.AnalyzerRun;
import ai.whylabs.dataservice.requests.CountAnalyzerRunRequest;
import ai.whylabs.dataservice.requests.GetAnalyzerRunsRequest;
import ai.whylabs.dataservice.responses.CountAnalyzerRunResult;
import ai.whylabs.dataservice.structures.ColumnSchema;
import ai.whylabs.dataservice.util.DatasourceConstants;
import ai.whylabs.dataservice.util.NativeQueryHelper;
import ai.whylabs.dataservice.util.ParametersDerivedFromSchema;
import ai.whylabs.dataservice.util.PostgresUtil;
import com.beust.jcommander.internal.Lists;
import io.micronaut.context.annotation.Executable;
import io.micronaut.data.annotation.Repository;
import io.micronaut.data.repository.PageableRepository;
import io.micronaut.scheduling.annotation.Async;
import io.micronaut.transaction.annotation.TransactionalAdvice;
import java.math.BigInteger;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import javax.inject.Inject;
import javax.inject.Named;
import javax.inject.Singleton;
import javax.persistence.EntityExistsException;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.sql.DataSource;
import javax.transaction.Transactional;
import lombok.Cleanup;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import org.apache.commons.lang.StringUtils;
import org.hibernate.query.internal.NativeQueryImpl;

@Slf4j
@Singleton
@RequiredArgsConstructor
@Repository
public abstract class AnalyzerRunRepository implements PageableRepository<AnalyzerRun, String> {

  @PersistenceContext private EntityManager entityManager;

  @PersistenceContext(name = DatasourceConstants.READONLY)
  private EntityManager roEntityManager;

  public static final String TABLE_NAME = "analyzer_runs";

  @Inject
  @Named(DatasourceConstants.BULK)
  private DataSource bulkDatasource;

  @Inject private BulkLoadAuditRepository bulkLoadAuditRepository;

  @Async("indexer")
  @Transactional
  public void indexAnalyzerRuns(List<AnalyzerRun> analyzerRuns) {
    for (val entity : analyzerRuns) {
      try {
        entityManager.persist(entity);
      } catch (EntityExistsException e) {
        log.info("Entry already exists for {}. Skipping", entity.getId());
      }
    }
    entityManager.flush();
  }

  @Transactional
  @TransactionalAdvice(DatasourceConstants.READONLY)
  @Executable
  public CountAnalyzerRunResult countAnalyzerRuns(CountAnalyzerRunRequest request) {
    String q =
        "select count(1) as count "
            + "from whylabs.analyzer_runs d\n"
            + "where d.org_id = :orgId\n"
            + "  and (:monitorIdCount = 0 or d.monitor_ids && :monitorIds)"
            + "  and (:analyzerIdCount = 0 or d.analyzer_id in :analyzerIds)\n"
            + "  and d.dataset_id in (:datasetIds) "
            + "  and d.started_ts >= :start\n"
            + "  and d.started_ts < :end\n";

    if (request.isReadPgMonitor()) {
      q = q.replace("analyzer_runs", "async_analyzer_requests_emulate_runs_table");
    }

    val interval = request.getInterval();
    val query = (NativeQueryImpl) roEntityManager.createNativeQuery(q);
    PostgresUtil.setStandardTimeout(query);
    NativeQueryHelper.populateMultivaluedOptionalStringListFilter(
        query, request.getMonitorIds(), "monitorIds", "monitorIdCount");
    query.setParameter("orgId", request.getOrgId());
    query.setParameter("datasetIds", request.getDatasetIds());
    query.setParameter(
        "start", java.sql.Date.from(Instant.ofEpochMilli(interval.getStartMillis())));
    query.setParameter("end", java.sql.Date.from(Instant.ofEpochMilli(interval.getEndMillis())));
    NativeQueryHelper.populateOptionalStringListFilter(
        query, request.getAnalyzerIds(), "analyzerIds", "analyzerIdCount");

    val row = query.getResultList().get(0);
    return CountAnalyzerRunResult.builder().count(((BigInteger) row).longValue()).build();
  }

  @Transactional
  @Executable
  @TransactionalAdvice(DatasourceConstants.READONLY)
  public List<AnalyzerRun> listAnalyzerRuns(GetAnalyzerRunsRequest request) {
    String q =
        "select * from whylabs.analyzer_runs d\n"
            + "where d.org_id = :orgId\n"
            + "  and (:monitorIdCount = 0 or d.monitor_ids && :monitorIds)"
            + "  and (:analyzerIdCount = 0 or d.analyzer_id in :analyzerIds)\n"
            + "  and d.dataset_id in (:datasetIds) "
            + "  and d.started_ts >= :start\n"
            + "  and d.started_ts < :end\n"
            + " order by d.started_ts "
            + request.getOrder().name()
            + " limit :limit offset :offset";

    if (request.isReadPgMonitor()) {
      q = q.replace("analyzer_runs", "async_analyzer_requests_emulate_runs_table");
    }

    val interval = request.getInterval();
    val query = (NativeQueryImpl) roEntityManager.createNativeQuery(q, AnalyzerRun.class);
    NativeQueryHelper.populateMultivaluedOptionalStringListFilter(
        query, request.getMonitorIds(), "monitorIds", "monitorIdCount");
    PostgresUtil.setStandardTimeout(query);
    query.setParameter("orgId", request.getOrgId());
    query.setParameter("datasetIds", request.getDatasetIds());
    query.setParameter(
        "start", java.sql.Date.from(Instant.ofEpochMilli(interval.getStartMillis())));
    query.setParameter("end", java.sql.Date.from(Instant.ofEpochMilli(interval.getEndMillis())));
    query.setParameter("limit", request.getLimit());
    query.setParameter("offset", request.getOffset());

    NativeQueryHelper.populateOptionalStringListFilter(
        query, request.getAnalyzerIds(), "analyzerIds", "analyzerIdCount");

    return query.getResultList();
  }

  @Async("indexer")
  public void triggerBulkLoadAsync(
      String tempTable, List<ColumnSchema> schema, PostgresBulkIngestionMode mode, String dedupeKey)
      throws SQLException {
    triggerBulkLoad(tempTable, schema, mode, dedupeKey);
  }

  @Transactional(rollbackOn = SQLException.class)
  @TransactionalAdvice(DatasourceConstants.BULK)
  @Executable
  public void triggerBulkLoad(
      String tempTable, List<ColumnSchema> schema, PostgresBulkIngestionMode mode, String dedupeKey)
      throws SQLException {
    if (mode.equals(PostgresBulkIngestionMode.replace)) {
      /**
       * When replacing we'll remove the time range represented by the snapshot. This also lets us
       * rebuild a table without stopping our streaming ingestion as the data being purged is older.
       */
      try (Connection con = bulkDatasource.getConnection()) {
        @Cleanup
        PreparedStatement pst =
            con.prepareStatement("select max(created_ts::timestamp) from whylabs." + tempTable);
        pst.execute("set statement_timeout to 36000000");
        val rs = pst.executeQuery();
        if (!rs.next()) {
          throw new SQLException("Snapshot was empty, bulk load cannot proceed from " + tempTable);
        }
        val max = rs.getTimestamp(1);
        log.info("Purging analyzer run data before {}", max);
        val purgeAudit =
            con.prepareStatement(
                "delete from whylabs.analyzer_runs where created_ts is null or created_ts <= ?");
        purgeAudit.execute("set statement_timeout to 36000000");
        purgeAudit.setTimestamp(1, max);
        log.info("Purging {} records from analyzer run table", purgeAudit.executeUpdate());
      }
    }

    String queryTemplate =
        "insert into whylabs.analyzer_runs(%s) select %s from whylabs.%s where org_id is not null on conflict(id) do nothing ";
    List<String> insertColumns = Lists.newArrayList();
    List<String> selectColumns = Lists.newArrayList();
    for (val column : schema) {
      insertColumns.add(column.getColumn_name());

      if (column.getUdt_name().equals("bool")) {
        // PG can't cast long::boolean directly, gotta hop through int
        selectColumns.add(column.getColumn_name() + "::int::bool");
      } else {
        selectColumns.add(column.getColumn_name() + "::" + column.getUdt_name());
      }
    }

    @ParametersDerivedFromSchema
    String bulkLoadQuery =
        String.format(
            queryTemplate,
            StringUtils.join(insertColumns, ", "),
            StringUtils.join(selectColumns, ", "),
            materializedViewName(tempTable));
    log.info("Executing bulk load {}", bulkLoadQuery);
    try (val con = bulkDatasource.getConnection()) {
      con.setAutoCommit(false);
      try (val stmt = con.createStatement()) {
        stmt.setQueryTimeout(3600);
        stmt.execute("set statement_timeout to 3600000");
        val start = Instant.now();
        stmt.execute(bulkLoadQuery);
        log.info(
            "ran in {} {}",
            Duration.between(start, Instant.now()).toMillis() / 1000.0,
            bulkLoadQuery);
      } catch (SQLException e) {
        log.error("Batch failed", e);
        throw e;
      } finally {
        log.info("Dropping foreign table. Table name: {}", tempTable);
        try (val stmt = con.createStatement()) {
          stmt.execute("DROP FOREIGN TABLE whylabs." + tempTable + " CASCADE ");
        } catch (SQLException e) {
          log.error("Failed to drop the foreign table: {}", tempTable);
        }
      }
    }
  }
}
