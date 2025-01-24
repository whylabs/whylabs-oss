package ai.whylabs.dataservice.services;

import static ai.whylabs.dataservice.controllers.BulkLoadController.materializedViewName;

import ai.whylabs.core.configV3.structure.EntitySchema;
import ai.whylabs.core.configV3.structure.MonitorConfigV3;
import ai.whylabs.core.configV3.structure.MonitorConfigV3Row;
import ai.whylabs.core.enums.PostgresBulkIngestionMode;
import ai.whylabs.core.serde.MonitorConfigV3JsonSerde;
import ai.whylabs.dataservice.requests.GetEntitySchemaRequest;
import ai.whylabs.dataservice.structures.ColumnSchema;
import ai.whylabs.dataservice.util.DatasourceConstants;
import ai.whylabs.dataservice.util.MicronautUtil;
import ai.whylabs.dataservice.util.ParametersDerivedFromSchema;
import com.beust.jcommander.internal.Lists;
import com.google.common.cache.Cache;
import com.google.common.cache.CacheBuilder;
import com.google.common.cache.CacheLoader;
import io.micronaut.context.annotation.Executable;
import io.micronaut.context.annotation.Value;
import io.micronaut.core.io.Readable;
import io.micronaut.data.annotation.Repository;
import io.micronaut.data.jdbc.annotation.JdbcRepository;
import io.micronaut.data.model.query.builder.sql.Dialect;
import io.micronaut.transaction.annotation.TransactionalAdvice;
import java.io.IOException;
import java.io.StringReader;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.Callable;
import java.util.concurrent.TimeUnit;
import javax.annotation.Nullable;
import javax.inject.Inject;
import javax.inject.Named;
import javax.inject.Singleton;
import javax.json.Json;
import javax.json.JsonPatch;
import javax.json.JsonValue;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.sql.DataSource;
import javax.transaction.Transactional;
import lombok.Cleanup;
import lombok.RequiredArgsConstructor;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import org.apache.commons.lang.StringUtils;
import org.hibernate.query.internal.NativeQueryImpl;

@Slf4j
@Singleton
@RequiredArgsConstructor
@Repository
@JdbcRepository(dialect = Dialect.POSTGRES)
public abstract class MonitorConfigService {

  public static final String TABLE = "monitor_config";

  @PersistenceContext(name = DatasourceConstants.READONLY)
  private EntityManager entityManager;

  @Inject
  @Named(DatasourceConstants.BULK)
  private DataSource bulkDatasource;

  @Inject
  @Named(DatasourceConstants.READONLY)
  private DataSource roDatasource;

  @Inject private BulkLoadAuditRepository bulkLoadAuditRepository;
  private String monitorConfigLatestQuery;
  private String monitorConfigInsertQuery;
  @Inject private EntitySchemaService entitySchemaService;

  private Cache<String, MonitorConfigV3> MONITOR_CONFIG_CACHE =
      CacheBuilder.newBuilder().expireAfterWrite(1, TimeUnit.MINUTES).maximumSize(1000).build();

  public MonitorConfigService(
      @Value("${sql-files.monitor-config-latest-upsert}") Readable monitorConfigLatestQuery,
      @Value("${sql-files.monitor-config-insert}") Readable monitorConfigInsertQuery)
      throws IOException {
    this.monitorConfigLatestQuery =
        MicronautUtil.getStringFromReadable(monitorConfigLatestQuery).replace("?&", "\\?\\?&");
    this.monitorConfigInsertQuery =
        MicronautUtil.getStringFromReadable(monitorConfigInsertQuery).replace("?&", "\\?\\?&");
  }

  @SneakyThrows
  public MonitorConfigV3 getMonitorConfigCached(String orgId, String datasetId) {
    String cacheKey = orgId + datasetId;

    try {
      MonitorConfigV3 c =
          new MonitorConfigV3(
              MONITOR_CONFIG_CACHE.get(
                  cacheKey,
                  new Callable<MonitorConfigV3>() {
                    @Override
                    public MonitorConfigV3 call() throws Exception {
                      val c = getLatest(orgId, datasetId);
                      if (c.isPresent()) {
                        return MonitorConfigV3JsonSerde.parseMonitorConfigV3(c.get().getJsonConf());
                      }
                      return null;
                    }
                  }));
      if (isConfigStale(c)) {
        MONITOR_CONFIG_CACHE.invalidate(cacheKey);
        val conf = getLatest(orgId, datasetId);
        if (conf.isPresent()) {
          return MonitorConfigV3JsonSerde.parseMonitorConfigV3(conf.get().getJsonConf());
        }
      }
      return c;
    } catch (CacheLoader.InvalidCacheLoadException e) {
      return null;
    }
  }

  public MonitorConfigV3 getLatestConf(String orgId, String datasetId) {
    val row = getLatest(orgId, datasetId);
    if (row.isPresent()) {
      return MonitorConfigV3JsonSerde.parseMonitorConfigV3(row.get());
    }
    return null;
  }

  /**
   * This wont scale forever but we only need to do it once and last I checked the entirety of
   * monitor configs is <2mb in prod, so we oughta be fine.
   *
   * @return
   */
  @SneakyThrows
  @Executable
  @Transactional
  @TransactionalAdvice(DatasourceConstants.BULK)
  public List<MonitorConfigV3Row> getAllConfigs() {
    @Cleanup Connection db = bulkDatasource.getConnection();
    @Cleanup
    val query =
        db.prepareStatement(
            "select json_conf, monitor_config.org_id, monitor_config.dataset_id  from  whylabs.monitor_config inner join whylabs.monitor_config_latest on monitor_config.id = monitor_config_latest.monitor_config_id");
    val rs = query.executeQuery();
    List<MonitorConfigV3Row> rows = Lists.newArrayList();
    while (rs.next()) {
      rows.add(
          MonitorConfigV3Row.builder()
              .jsonConf(rs.getString(1))
              .orgId(rs.getString(2))
              .datasetId(rs.getString(3))
              .build());
    }
    return rows;
  }

  /** High performance check if the monitor config is stale */
  @SneakyThrows
  @Executable
  @Transactional
  @TransactionalAdvice(DatasourceConstants.BULK)
  public boolean isConfigStale(MonitorConfigV3 monitorConfig) {
    if (monitorConfig.getMetadata() == null || monitorConfig.getMetadata().getVersion() == null) {
      return false;
    }
    @Cleanup Connection db = bulkDatasource.getConnection();
    @Cleanup
    val latestQuery =
        db.prepareStatement(
            "select version from whylabs.monitor_config_latest where org_id = ?  and dataset_id = ?");
    latestQuery.setString(1, monitorConfig.getOrgId());
    latestQuery.setString(2, monitorConfig.getDatasetId());
    val r = latestQuery.executeQuery();

    while (r.next()) {
      val id = r.getString(1);
      if (id == null) {
        return false;
      }
      if (!monitorConfig.getMetadata().getVersion().equals(Integer.valueOf(id))) {
        return true;
      }
    }
    return false;
  }

  @SneakyThrows
  @Executable
  @Transactional
  @TransactionalAdvice(
      DatasourceConstants.BULK) // Used by the UI (soon), should be strongly consistent
  public Optional<MonitorConfigV3Row> getLatest(String orgId, String datasetId) {

    @Cleanup Connection db = bulkDatasource.getConnection();
    val latestQuery =
        db.prepareStatement(
            "select monitor_config_id, updated_ts from whylabs.monitor_config_latest where org_id = ? and dataset_id = ? ");
    latestQuery.setString(1, orgId);
    latestQuery.setString(2, datasetId);
    val pk = latestQuery.executeQuery();

    if (!pk.next()) {
      return Optional.empty();
    }

    Long id = pk.getLong(1);
    Timestamp updated = pk.getTimestamp(2);

    ResultSet rs = null;
    if (updated == null) {
      val query = db.prepareStatement("select * from whylabs.monitor_config where id = ?");
      query.setLong(1, pk.getLong(1));
      rs = query.executeQuery();
    } else {
      val query =
          db.prepareStatement(
              "select * from whylabs.monitor_config where id = ? and updated_ts = ?");
      query.setLong(1, pk.getLong(1));
      query.setTimestamp(2, updated);
      rs = query.executeQuery();
    }

    if (!rs.next()) {
      return Optional.empty();
    }

    val ret =
        Optional.of(
            MonitorConfigV3Row.builder()
                .jsonConf(rs.getString("json_conf"))
                .orgId(orgId)
                .datasetId(datasetId)
                .build());
    return ret;
  }

  @SneakyThrows
  @Executable
  @Transactional
  @TransactionalAdvice(DatasourceConstants.READONLY)
  public List<EntitySchema> getWideDatasets() {
    // Grab anything with >2k columns in the entity schema
    String q =
        "with counts as (select count(*) as c, entity_schema_id from whylabs.column_schema group by entity_schema_id)\n"
            + "select org_id, dataset_id from counts  join whylabs.entity_schema on counts.entity_schema_id = entity_schema.id and counts.c > 2000 limit 1000";

    @Cleanup Connection db = roDatasource.getConnection();
    val pst = db.prepareStatement(q);
    val r = pst.executeQuery();
    List<EntitySchema> rows = new ArrayList<>();
    while (r.next()) {
      GetEntitySchemaRequest req = new GetEntitySchemaRequest();
      req.setOrgId(r.getString(1));
      req.setDatasetId(r.getString(2));
      rows.add(entitySchemaService.getWithCaching(req));
    }

    if (rows.size() > 900) {
      log.error(
          "We've grown to the point of having {} large models. Woohoo we're profitable, but this approach is going to fall behind and need some tweaking",
          Integer.valueOf(rows.size()));
    }
    return rows;
  }

  @Executable
  public Optional<JsonPatch> versionDiff(
      String orgId, String datasetId, @Nullable Long version1, @Nullable Long version2) {
    val row1 = getVersioned(orgId, datasetId, Optional.ofNullable(version1));
    val row2 = getVersioned(orgId, datasetId, Optional.ofNullable(version2));
    val config1 = row1.map(MonitorConfigV3Row::getJsonConf);
    val config2 = row2.map(MonitorConfigV3Row::getJsonConf);
    if (!config1.isPresent() || !config2.isPresent()) {
      return Optional.ofNullable(null);
    }
    JsonValue json1 = Json.createReader(new StringReader(config1.get())).readValue();
    JsonValue json2 = Json.createReader(new StringReader(config2.get())).readValue();

    return Optional.ofNullable(Json.createDiff(json1.asJsonObject(), json2.asJsonObject()));
  }

  @Executable
  @Transactional
  @TransactionalAdvice(DatasourceConstants.READONLY)
  public Optional<MonitorConfigV3Row> getVersioned(
      String orgId, String datasetId, Optional<Long> version) {

    String q =
        "select * from whylabs.monitor_config\n"
            + "where org_id = :orgId and dataset_id = :datasetId\n"
            + "  and ((:version is not null and json_conf->'metadata'->>'version' = :version)\n"
            + "    or (:version is null and updated_ts = (select max(updated_ts) updated_ts from whylabs.monitor_config where org_id = :orgId and dataset_id = :datasetId)))"
            + "order by updated_ts limit 1";
    val query = (NativeQueryImpl) entityManager.createNativeQuery(q, MonitorConfigV3Row.class);
    query.setParameter("orgId", orgId);
    query.setParameter("datasetId", datasetId);
    query.setParameter("version", version.map(l -> l.toString()).orElse(null));

    val l = query.getResultList();
    if (l.size() < 1) {
      return Optional.empty();
    }
    return Optional.of((MonitorConfigV3Row) l.get(0));
  }

  @Transactional
  public Optional<MonitorConfigV3Row> listVersions(
      String orgId, String datasetId, @Nullable String analysisId) {
    return null;
  }

  @Executable
  @Transactional
  @TransactionalAdvice(DatasourceConstants.READONLY)
  public Optional<MonitorConfigV3Row> getVersioned(String orgId, String datasetId, Long version) {
    if (version == null) {
      // Version didn't get added in til later so we don't have this info all the way back in time
      return Optional.empty();
    }
    String q =
        "select * from whylabs.monitor_config where org_id = :orgId and dataset_id = :datasetId and json_conf->'metadata'->>'version' = :version limit 1";

    val query = (NativeQueryImpl) entityManager.createNativeQuery(q, MonitorConfigV3Row.class);
    query.setParameter("orgId", orgId);
    query.setParameter("datasetId", datasetId);
    query.setParameter("version", version.toString());

    val l = query.getResultList();
    if (l.size() < 1) {
      return Optional.empty();
    }
    return Optional.of((MonitorConfigV3Row) l.get(0));
  }

  @SneakyThrows
  @Transactional(rollbackOn = SQLException.class)
  @TransactionalAdvice(DatasourceConstants.BULK)
  @Executable
  public Boolean save(MonitorConfigV3Row row) {
    @Cleanup Connection db = bulkDatasource.getConnection();
    val pst = db.prepareStatement(monitorConfigInsertQuery);
    // org_id, dataset_id, json_conf, updated_ts
    pst.setString(1, row.getOrgId());
    pst.setString(2, row.getDatasetId());
    pst.setString(3, row.getJsonConf());
    pst.setTimestamp(4, new Timestamp(System.currentTimeMillis()));
    val r = pst.executeQuery();
    r.next();
    val pk = r.getLong(1);

    // Update the pointer in monitor_config_latest to the latest config if its in fact newer
    val updateLatest = db.prepareStatement(monitorConfigLatestQuery);
    updateLatest.setLong(1, pk);
    val rowCount = updateLatest.executeUpdate();
    return rowCount > 0;
  }

  @SneakyThrows
  @Transactional(rollbackOn = SQLException.class)
  @TransactionalAdvice(DatasourceConstants.BULK)
  @Executable
  public void toggle(String orgId, String datasetId, boolean disabled) {
    @Cleanup Connection db = bulkDatasource.getConnection();
    val pst =
        db.prepareStatement(
            "update whylabs.pg_monitor_schedule set disabled = ? where org_id = ? and dataset_id = ?");
    pst.setBoolean(1, disabled);
    pst.setString(2, orgId);
    pst.setString(3, datasetId);
    pst.executeUpdate();
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
        val truncate = con.prepareStatement("truncate whylabs.monitor_config");
        truncate.executeUpdate();
      }
    }

    String sql =
        "insert into whylabs.monitor_config"
            + "(%s) select %s from whylabs.%s where org_id is not null";

    List<String> insertColumns = Lists.newArrayList();
    List<String> selectColumns = Lists.newArrayList();
    for (val column : schema) {
      insertColumns.add(column.getColumn_name());

      if (column.getUdt_name().equals("bool")) {
        // PG can't cast long::boolean directly, gotta hop through int
        selectColumns.add(column.getColumn_name() + "::int::bool");
      } else if (column.getUdt_name().equals("timestamptz")) {
        selectColumns.add(
            "to_timestamp(" + column.getColumn_name() + "::bigint/1000)::timestamptz");
      } else {
        selectColumns.add(column.getColumn_name() + "::" + column.getUdt_name());
      }
    }

    @ParametersDerivedFromSchema
    String bulkLoadConfigsQuery =
        String.format(
            sql,
            StringUtils.join(insertColumns, ", "),
            StringUtils.join(selectColumns, ", "),
            materializedViewName(tempTable));

    try (val con = bulkDatasource.getConnection()) {
      con.setAutoCommit(false);
      try (val stmt = con.createStatement()) {
        stmt.setQueryTimeout(3600);
        stmt.execute("set statement_timeout to 3600000");
        Instant start = Instant.now();
        log.info("Executing bulk load {}", bulkLoadConfigsQuery);
        stmt.execute(bulkLoadConfigsQuery);
        log.info(
            "ran in {} {}",
            Double.valueOf(Duration.between(start, Instant.now()).toMillis() / 1000.0),
            bulkLoadConfigsQuery);

        bulkLoadAuditRepository.markSuccess(dedupeKey);
      } catch (SQLException e) {
        log.error("Batch failed", e);
        bulkLoadAuditRepository.markFailed(dedupeKey);
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
