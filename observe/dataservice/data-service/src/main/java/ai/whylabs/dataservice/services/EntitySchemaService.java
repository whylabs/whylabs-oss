package ai.whylabs.dataservice.services;

import ai.whylabs.core.configV3.structure.*;
import ai.whylabs.core.configV3.structure.enums.Classifier;
import ai.whylabs.core.configV3.structure.enums.DataType;
import ai.whylabs.core.configV3.structure.enums.DiscretenessType;
import ai.whylabs.core.enums.ModelType;
import ai.whylabs.dataservice.DataSvcConfig;
import ai.whylabs.dataservice.entitySchema.DefaultSchemaMetadata;
import ai.whylabs.dataservice.entitySchema.EntitySchemaMetadata;
import ai.whylabs.dataservice.entitySchema.EntitySchemaMetadataImpl;
import ai.whylabs.dataservice.requests.GetEntitySchemaRequest;
import ai.whylabs.dataservice.util.DatasourceConstants;
import ai.whylabs.dataservice.util.NativeQueryHelper;
import com.google.common.cache.Cache;
import com.google.common.cache.CacheBuilder;
import com.google.common.cache.CacheLoader;
import com.google.common.collect.ImmutableSet;
import com.google.common.collect.Lists;
import io.micronaut.context.annotation.Executable;
import io.micronaut.data.annotation.Repository;
import io.micronaut.http.HttpStatus;
import io.micronaut.http.exceptions.HttpStatusException;
import io.micronaut.scheduling.annotation.Async;
import io.micronaut.transaction.annotation.TransactionalAdvice;
import io.swagger.v3.oas.annotations.Operation;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.sql.*;
import java.util.*;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeUnit;
import javax.inject.Inject;
import javax.inject.Named;
import javax.inject.Singleton;
import javax.sql.DataSource;
import javax.transaction.Transactional;
import lombok.Cleanup;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import org.apache.commons.io.IOUtils;
import org.postgresql.jdbc.PgArray;

@Slf4j
@Singleton
@Repository
public class EntitySchemaService {

  private final String entitySchemaUpsert;
  private final String entitySchemaUpdate;
  private final String columnSchemaUpsert;
  private final String columnSchemaAppend;
  private final String metricSchemaUpsert;
  private final EntitySchemaMetadata entitySchemaMetadata;

  /**
   * 99% of the time when writing profiles there's no new columns, so we can skip the persistence.
   * This in-mem cache tells us we can skip b/c there's nothing new. Note: We kep this cache pretty
   * small b/c entity schema on wide datasets can approach 1MB+, so its weirdly bulky.
   */
  private static final Cache<GetEntitySchemaRequest, EntitySchema> CACHE =
      CacheBuilder.newBuilder().maximumSize(200).expireAfterWrite(1, TimeUnit.MINUTES).build();

  @Inject
  @Named(DatasourceConstants.BULK)
  private DataSource bulkDatasource;

  @Inject
  @Named(DatasourceConstants.READONLY)
  private DataSource readonlyDatasource;

  public EntitySchemaService(DataSvcConfig config) throws IOException {
    this.entitySchemaUpsert =
        IOUtils.resourceToString("/sql/entity-schema-upsert.sql", StandardCharsets.UTF_8);
    this.entitySchemaUpdate =
        IOUtils.resourceToString("/sql/entity-schema-update.sql", StandardCharsets.UTF_8);
    this.columnSchemaUpsert =
        IOUtils.resourceToString("/sql/column-schema-upsert.sql", StandardCharsets.UTF_8);
    this.columnSchemaAppend =
        IOUtils.resourceToString("/sql/column-schema-append-if-new.sql", StandardCharsets.UTF_8);
    this.metricSchemaUpsert =
        IOUtils.resourceToString("/sql/metric-schema-upsert.sql", StandardCharsets.UTF_8);
    this.entitySchemaMetadata = new EntitySchemaMetadataImpl(config);
  }

  /**
   * 99% of the time the previous entity schema already has all the columns present. In such cases
   * there's no need to ping postgres with a bunch of no-op writes. Performance aside, this reduces
   * row lock contention on the entity schema table.
   */
  @SneakyThrows
  @Transactional
  @TransactionalAdvice(DatasourceConstants.BULK)
  @Executable
  @Async("indexer")
  public void fastSave(String orgId, String datasetId, EntitySchema entitySchema) {
    save(orgId, datasetId, entitySchema, false);
  }

  /**
   * Remove any columns from the database that aren't in the specified entity schema
   *
   * @param db
   * @param entitySchemaPk
   * @param entitySchema
   */
  @SneakyThrows
  private int removeAbsentColumns(
      Connection db, int entitySchemaPk, EntitySchema entitySchema, EntitySchema oldEntitySchema) {
    // usually expect remove to be rare, so delete specific + upsert rather than delete all and
    // insert
    val newCols = entitySchema.getColumns();
    Set<String> colsToRemove =
        (oldEntitySchema == null || oldEntitySchema.getColumns() == null)
            ? new HashSet<String>()
            : oldEntitySchema.getColumns().keySet();
    if (newCols != null) {
      colsToRemove.removeAll(newCols.keySet());
    }
    if (!colsToRemove.isEmpty()) {
      deleteColumns(db, colsToRemove, entitySchemaPk);
    }
    return colsToRemove.size();
  }

  @SneakyThrows
  private int removeAbsentMetrics(
      Connection db, int entitySchemaPk, EntitySchema entitySchema, EntitySchema oldEntitySchema) {
    val newMetrics = entitySchema.getCustomMetrics();
    val metricsToRemove =
        (oldEntitySchema == null || oldEntitySchema.getCustomMetrics() == null)
            ? new HashSet<String>()
            : oldEntitySchema.getCustomMetrics().keySet();
    if (newMetrics != null) {
      metricsToRemove.removeAll(newMetrics.keySet());
    }
    if (!metricsToRemove.isEmpty()) {
      deleteCustomMetrics(db, metricsToRemove, entitySchemaPk);
    }
    return metricsToRemove.size();
  }

  @SneakyThrows
  @Transactional
  @TransactionalAdvice(DatasourceConstants.BULK)
  @Executable
  @Operation(operationId = "SaveEntitySchema")
  public void save(String orgId, String datasetId, EntitySchema entitySchema, boolean remove) {
    val g = new GetEntitySchemaRequest();
    g.setOrgId(orgId);
    g.setDatasetId(datasetId);
    g.setIncludeHidden(true);
    g.setEventuallyConsistent(true);
    val oldEntitySchema = getWithCaching(g);

    @Cleanup Connection db = bulkDatasource.getConnection();
    int changes = 0;
    int entitySchemaPk;

    if (oldEntitySchema != null) {
      // Try to pull the PK from the read replica, we wont increment versions unless there's a
      // change below
      entitySchemaPk = oldEntitySchema.getId();
    } else {
      // Fresh new entity schema, gotta write a row for the first time
      entitySchemaPk = upsertSchema(db, orgId, datasetId, entitySchema);
    }

    val cols = entitySchema.getColumns();
    val metrics = entitySchema.getCustomMetrics();
    if (remove) {
      changes += removeAbsentColumns(db, entitySchemaPk, entitySchema, oldEntitySchema);
      changes += removeAbsentMetrics(db, entitySchemaPk, entitySchema, oldEntitySchema);
    } else {
      /**
       * Remove unchanged existing columns. This optimization is skipped when doing overwrites
       * (delete=true) because it uses a cached version of the entity schema
       */
      if (cols != null
          && cols.size() > 0
          && oldEntitySchema != null
          && oldEntitySchema.getColumns().size() > 0) {
        for (val e : oldEntitySchema.getColumns().entrySet()) {
          val col = entitySchema.getColumns().get(e.getKey());
          val oldCol = oldEntitySchema.getColumns().get(e.getKey());
          if (ColumnSchema.majorUpdate(col, oldCol)) {
            cols.remove(e.getKey());
          }
        }
      }

      // Remove unchanged existing custom metrics
      if (metrics != null
          && metrics.size() > 0
          && oldEntitySchema != null
          && oldEntitySchema.getCustomMetrics() != null
          && oldEntitySchema.getCustomMetrics().size() > 0) {
        for (val m : oldEntitySchema.getCustomMetrics().entrySet()) {
          val metric = entitySchema.getCustomMetrics().get(m.getKey());
          val oldMetric = oldEntitySchema.getCustomMetrics().get(m.getKey());
          if (metric != null && oldMetric != null && metric.equals(oldMetric)) {
            metrics.remove(m.getKey());
          }
        }
      }
    }

    // Write only the new/updated columns
    if (cols != null && cols.size() > 0) {
      writeColumns(db, cols, entitySchemaPk, true);
      CACHE.invalidate(g);
      changes += cols.size();
    }

    // Write only the new/updated custom metrics
    if (metrics != null && metrics.size() > 0) {
      writeCustomMetrics(db, metrics, entitySchemaPk);
      CACHE.invalidate(g);
      changes += metrics.size();
    }
    if (EntitySchema.majorUpdate(entitySchema, oldEntitySchema) || changes > 0) {
      /**
       * Stuff changed, bump the version on the entity schema parent row. By conditioning on the
       * changes > 0 we avoid unecessary version bumps and thus row lock contention upserting the
       * row
       */
      upsertSchema(db, orgId, datasetId, entitySchema);
    }
  }

  @SneakyThrows
  @Transactional
  // Keep config/schema stuff on the master node to avoid eventual consistency issues for things
  // folks can edit via the UI or API
  @TransactionalAdvice(DatasourceConstants.BULK)
  @Executable
  public void toggleHidden(String orgId, String datasetId, boolean hidden, String columnName) {
    @Cleanup Connection db = bulkDatasource.getConnection();
    @Cleanup
    PreparedStatement pst =
        db.prepareStatement(
            "select id from whylabs.entity_schema where org_id = ? and dataset_id = ?");
    pst.setString(1, orgId);
    pst.setString(2, datasetId);
    val id = pst.executeQuery();
    id.next();
    val entitySchemaPk = id.getInt("id");
    @Cleanup
    PreparedStatement pst2 =
        db.prepareStatement(
            "update whylabs.column_schema set hidden = ? where entity_schema_id = ? and column_name = ?");
    pst2.setBoolean(1, hidden);
    pst2.setLong(2, entitySchemaPk);
    pst2.setString(3, columnName);
    pst2.execute();
  }

  @SneakyThrows
  private Map<String, ColumnSchema> readColumns(
      Connection db, int entitySchemaPk, boolean includeHidden) throws SQLException {
    String columnQueryStr = "select * from whylabs.column_schema where entity_schema_id = ?";
    if (!includeHidden) {
      columnQueryStr = columnQueryStr + " and hidden = false";
    }

    @Cleanup PreparedStatement columnQuery = db.prepareStatement(columnQueryStr);
    columnQuery.setLong(1, entitySchemaPk);

    val c = columnQuery.executeQuery();
    Map<String, ColumnSchema> columns = new HashMap<>();
    while (c.next()) {

      val builder =
          ColumnSchema.builder()
              .discreteness(DiscretenessType.valueOf(c.getString("discreteness")))
              .dataType(DataType.valueOf(c.getString("data_type")))
              .classifier(Classifier.valueOf(c.getString("classifier")));

      val tags = (PgArray) c.getObject("tags");
      if (tags != null) {
        val ta = (String[]) tags.getArray();
        if (ta.length > 0) {
          builder.tags(Lists.newArrayList(ta));
        }
      }
      columns.put(
          c.getString("column_name"),
          builder
              // TODO: Add support for metadata, last_updated
              .build());
    }
    return columns;
  }

  @SneakyThrows
  private int upsertSchema(Connection db, String orgId, String datasetId, EntitySchema entitySchema)
      throws SQLException {
    @Cleanup PreparedStatement pst = db.prepareStatement(entitySchemaUpsert);
    pst.setString(1, orgId);
    pst.setString(2, datasetId);
    if (entitySchema.getMetadata() != null) {
      pst.setObject(3, entitySchema.getMetadata().getVersion(), Types.NUMERIC);
      pst.setObject(4, entitySchema.getMetadata().getSchemaVersion(), Types.NUMERIC);
      pst.setTimestamp(5, new Timestamp(System.currentTimeMillis()));
      pst.setObject(6, entitySchema.getMetadata().getAuthor(), Types.VARCHAR);
      pst.setObject(7, entitySchema.getMetadata().getDescription(), Types.VARCHAR);
    } else {
      pst.setObject(3, null, Types.NUMERIC);
      pst.setObject(4, null, Types.NUMERIC);
      pst.setTimestamp(5, new Timestamp(System.currentTimeMillis()));
      pst.setObject(6, null, Types.VARCHAR);
      pst.setObject(7, null, Types.VARCHAR);
    }
    pst.setObject(8, entitySchema.getModelType(), Types.VARCHAR);
    val id = pst.executeQuery();
    id.next();
    return id.getInt("id");
  }

  /**
   * Prepare for an update to existing schema by bumping version and returning ID. Fail if doesnt
   * exist.
   *
   * @param db
   * @param orgId
   * @param datasetId
   * @return
   * @throws SQLException
   */
  @SneakyThrows
  private Integer updateExistingSchema(Connection db, String orgId, String datasetId)
      throws SQLException {
    @Cleanup PreparedStatement pst = db.prepareStatement(entitySchemaUpdate);
    pst.setString(1, orgId);
    pst.setString(2, datasetId);
    val id = pst.executeQuery();
    val exists = id.next();
    return exists ? id.getInt("id") : null;
  }

  @SneakyThrows
  private void writeColumns(
      Connection db, Map<String, ColumnSchema> columns, int entitySchemaPk, boolean overwrite)
      throws SQLException {
    @Cleanup
    PreparedStatement columnQuery =
        db.prepareStatement(overwrite ? columnSchemaUpsert : columnSchemaAppend);
    for (val col : columns.entrySet()) {
      columnQuery.setObject(1, entitySchemaPk);
      columnQuery.setString(2, col.getKey());
      columnQuery.setObject(
          3,
          col.getValue().getDiscreteness() != null ? col.getValue().getDiscreteness().name() : null,
          Types.VARCHAR);
      columnQuery.setObject(
          4,
          col.getValue().getClassifier() != null ? col.getValue().getClassifier().name() : null,
          Types.VARCHAR);
      columnQuery.setObject(
          5,
          col.getValue().getDataType() != null ? col.getValue().getDataType().name() : null,
          Types.VARCHAR);

      columnQuery.setObject(6, NativeQueryHelper.toArray(db, col.getValue().getTags()));
      // TODO: Add metadata json support
      columnQuery.addBatch();
    }
    columnQuery.executeBatch();
  }

  @SneakyThrows
  private void deleteColumns(Connection db, Set<String> columnNames, int entitySchemaPk)
      throws SQLException {
    @Cleanup
    PreparedStatement colDeleteQuery =
        db.prepareStatement(
            "delete from whylabs.column_schema where entity_schema_id = ? and column_name = ?");
    if (columnNames.isEmpty()) return;
    for (val name : columnNames) {
      colDeleteQuery.setObject(1, entitySchemaPk);
      colDeleteQuery.setString(2, name);
      colDeleteQuery.addBatch();
    }
    colDeleteQuery.executeBatch();
  }

  @SneakyThrows
  private Map<String, CustomMetricSchema> readCustomMetrics(Connection db, int entitySchemaPk)
      throws SQLException {
    String metricQueryStr = "select * from whylabs.custom_metric_schema where entity_schema_id = ?";
    @Cleanup PreparedStatement metricQuery = db.prepareStatement(metricQueryStr);
    metricQuery.setLong(1, entitySchemaPk);
    val m = metricQuery.executeQuery();

    Map<String, CustomMetricSchema> metrics = new HashMap<>();
    while (m != null && m.next()) {
      val builder =
          CustomMetricSchema.builder()
              .label(m.getString("label"))
              .column(m.getString("column_name"))
              .builtinMetric(m.getString("builtin_metric"));
      metrics.put(m.getString("name"), builder.build());
    }
    return metrics;
  }

  @SneakyThrows
  private void writeCustomMetrics(
      Connection db, Map<String, CustomMetricSchema> metrics, int entitySchemaPk)
      throws SQLException {
    if (metrics.isEmpty()) return;
    @Cleanup PreparedStatement metricQuery = db.prepareStatement(metricSchemaUpsert);
    for (val metric : metrics.entrySet()) {
      metricQuery.setObject(1, entitySchemaPk);
      metricQuery.setString(2, metric.getKey());
      metricQuery.setString(3, metric.getValue().getColumn());
      metricQuery.setString(4, metric.getValue().getBuiltinMetric());
      metricQuery.setString(5, metric.getValue().getLabel());
      metricQuery.addBatch();
    }
    metricQuery.executeBatch();
  }

  @SneakyThrows
  private void deleteCustomMetrics(Connection db, Set<String> metricNames, int entitySchemaPk)
      throws SQLException {
    if (metricNames.isEmpty()) return;
    @Cleanup
    PreparedStatement metricDeleteQuery =
        db.prepareStatement(
            "delete from whylabs.custom_metric_schema where entity_schema_id = ? and name = ?");
    for (val name : metricNames) {
      metricDeleteQuery.setObject(1, entitySchemaPk);
      metricDeleteQuery.setString(2, name);
      metricDeleteQuery.addBatch();
    }
    metricDeleteQuery.executeBatch();
  }

  public EntitySchema getWithCaching(GetEntitySchemaRequest request) {
    try {
      return CACHE.get(
          request,
          new Callable<EntitySchema>() {
            @Override
            public EntitySchema call() {
              return getEventuallyConsistent(request);
            }
          });
    } catch (CacheLoader.InvalidCacheLoadException e) {
      // Null in database
      return null;
    } catch (ExecutionException e) {
      log.error("Error retrieving org " + request, e);
      return null;
    }
  }

  @SneakyThrows
  @Transactional
  @TransactionalAdvice(DatasourceConstants.READONLY)
  @Executable
  public EntitySchema getEventuallyConsistent(GetEntitySchemaRequest request) {
    @Cleanup Connection db = readonlyDatasource.getConnection();
    return get(request, db);
  }

  @SneakyThrows
  @Transactional
  // Keep config/schema stuff on the master node to avoid eventual consistency issues for things
  // folks can edit via the UI or API
  @TransactionalAdvice(DatasourceConstants.BULK)
  @Executable
  public EntitySchema getConsistent(GetEntitySchemaRequest request) {
    @Cleanup Connection db = bulkDatasource.getConnection();
    return get(request, db);
  }

  @SneakyThrows
  private EntitySchema get(GetEntitySchemaRequest request, Connection db) {
    @Cleanup
    PreparedStatement pst =
        db.prepareStatement(
            "select * from whylabs.entity_schema where org_id = ? and dataset_id = ?");
    pst.setString(1, request.getOrgId());
    pst.setString(2, request.getDatasetId());
    val r = pst.executeQuery();
    if (!r.next()) {
      return null;
    }
    Long updatedTimestamp = null;
    if (r.getTimestamp("updated_timestamp") != null) {
      updatedTimestamp = r.getTimestamp("updated_timestamp").toInstant().toEpochMilli();
    } else {
      // This field is required by songbird so guard against it being null
      updatedTimestamp = 0L;
    }
    ModelType modelType = null;
    if (r.getString("model_type") != null) {
      modelType = ModelType.valueOf(r.getString("model_type"));
    }
    String author = r.getString("author");
    if (author == null) {
      author = "system";
    }
    int schemaVersion = r.getInt("schema_version");
    if (r.wasNull()) {
      schemaVersion = 1;
    }
    int id = r.getInt("id");

    val b =
        EntitySchema.builder()
            .id(id)
            .modelType(modelType)
            .orgId(request.getOrgId())
            .datasetId(request.getDatasetId())
            .metadata(
                Metadata.builder()
                    .version(r.getInt("version"))
                    .schemaVersion(schemaVersion)
                    .updatedTimestamp(updatedTimestamp)
                    .author(author)
                    .description(r.getString("description"))
                    .build());
    Integer entitySchemaPk = r.getInt("id");

    b.columns(readColumns(db, entitySchemaPk, request.isIncludeHidden()));

    b.customMetrics(readCustomMetrics(db, entitySchemaPk));

    return b.build();
  }

  @SneakyThrows
  @Transactional
  @TransactionalAdvice(value = DatasourceConstants.BULK)
  @Executable
  public void deleteColumn(String orgId, String datasetId, String columnName) {
    @Cleanup Connection db = bulkDatasource.getConnection();
    Integer entitySchemaPk = updateExistingSchema(db, orgId, datasetId);
    if (entitySchemaPk == null) {
      log.info(
          "Attempt to delete column from non-existent entity schema for {} dataset {}",
          orgId,
          datasetId);
      throw new HttpStatusException(HttpStatus.NOT_FOUND, "Entity schema not found");
    }
    deleteColumns(db, ImmutableSet.of(columnName), entitySchemaPk);
  }

  @SneakyThrows
  @Transactional
  @TransactionalAdvice(value = DatasourceConstants.BULK)
  @Executable
  public void deleteCustomMetric(String orgId, String datasetId, String metricName) {
    @Cleanup Connection db = bulkDatasource.getConnection();
    Integer entitySchemaPk = updateExistingSchema(db, orgId, datasetId);
    if (entitySchemaPk == null) {
      log.info(
          "Attempt to delete metric from non-existent entity schema for {} dataset {}",
          orgId,
          datasetId);
      throw new HttpStatusException(HttpStatus.NOT_FOUND, "Entity schema not found");
    } else {
      deleteCustomMetrics(db, ImmutableSet.of(metricName), entitySchemaPk);
    }
  }

  @SneakyThrows
  public DefaultSchemaMetadata getDefaultSchemaMetadata() {
    DefaultSchemaMetadata metadata = entitySchemaMetadata.getOverrideDefaultSchemaMetadata();
    if (metadata == null) {
      return entitySchemaMetadata.getDefaultSchemaMetadata();
    }
    return metadata;
  }

  @SneakyThrows
  public void resetDefaultSchemaMetadata() {
    entitySchemaMetadata.resetOverrideDefaultSchemaMetadata();
  }

  @SneakyThrows
  public String writeDefaultSchemaMetadata(DefaultSchemaMetadata metadata) {
    return entitySchemaMetadata.writeOverrideDefaultSchemaMetadata(metadata);
  }

  @SneakyThrows
  @Transactional
  @TransactionalAdvice(value = DatasourceConstants.BULK)
  @Executable
  public ColumnSchema getColumn(String orgId, String datasetId, String columnName) {
    @Cleanup Connection db = bulkDatasource.getConnection();
    @Cleanup
    PreparedStatement pst =
        db.prepareStatement(
            "select cs.* from whylabs.entity_schema as es join whylabs.column_schema as cs on es.id = cs.entity_schema_id where es.org_id = ? and es.dataset_id = ? and cs.column_name = ?");
    pst.setString(1, orgId);
    pst.setString(2, datasetId);
    pst.setString(3, columnName);
    val r = pst.executeQuery();
    if (!r.next()) {
      return null;
    }
    val builder =
        ColumnSchema.builder()
            .discreteness(DiscretenessType.valueOf(r.getString("discreteness")))
            .dataType(DataType.valueOf(r.getString("data_type")))
            .classifier(Classifier.valueOf(r.getString("classifier")));

    val tags = (PgArray) r.getObject("tags");
    if (tags != null) {
      val ta = (String[]) tags.getArray();
      if (ta.length > 0) {
        builder.tags(Lists.newArrayList(ta));
      }
    }
    return builder.build();
  }

  @SneakyThrows
  @Transactional
  @TransactionalAdvice(value = DatasourceConstants.BULK)
  @Executable
  public CustomMetricSchema getCustomMetric(String orgId, String datasetId, String metricName) {
    @Cleanup Connection db = bulkDatasource.getConnection();
    @Cleanup
    PreparedStatement pst =
        db.prepareStatement(
            "select ms.* from whylabs.entity_schema as es join whylabs.custom_metric_schema as ms on es.id = ms.entity_schema_id  where es.org_id = ? and es.dataset_id = ? and ms.name = ?");
    pst.setString(1, orgId);
    pst.setString(2, datasetId);
    pst.setString(3, metricName);
    val r = pst.executeQuery();
    if (!r.next()) {
      return null;
    }
    val builder =
        CustomMetricSchema.builder()
            .label(r.getString("label"))
            .column(r.getString("column_name"))
            .builtinMetric(r.getString("builtin_metric"));
    return builder.build();
  }

  @SneakyThrows
  @Transactional
  @TransactionalAdvice(value = DatasourceConstants.BULK)
  @Executable
  public Map<String, CustomMetricSchema> getCustomMetrics(String orgId, String datasetId) {
    @Cleanup Connection db = bulkDatasource.getConnection();
    @Cleanup
    PreparedStatement pst =
        db.prepareStatement(
            "select ms.* from whylabs.entity_schema as es join whylabs.custom_metric_schema as ms on es.id = ms.entity_schema_id  where es.org_id = ? and es.dataset_id = ?");
    pst.setString(1, orgId);
    pst.setString(2, datasetId);
    val r = pst.executeQuery();
    Map<String, CustomMetricSchema> metrics = new HashMap<>();
    while (r.next()) {
      val builder =
          CustomMetricSchema.builder()
              .label(r.getString("label"))
              .column(r.getString("column_name"))
              .builtinMetric(r.getString("builtin_metric"));
      metrics.put(r.getString("name"), builder.build());
    }
    return metrics;
  }
}
