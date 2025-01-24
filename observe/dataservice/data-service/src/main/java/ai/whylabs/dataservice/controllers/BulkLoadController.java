package ai.whylabs.dataservice.controllers;

import ai.whylabs.core.enums.PostgresBulkIngestionMode;
import ai.whylabs.dataservice.enums.BulkLoadStatus;
import ai.whylabs.dataservice.requests.parquet.ParquetIngestResponse;
import ai.whylabs.dataservice.requests.parquet.ParquetIngestionRequest;
import ai.whylabs.dataservice.services.*;
import ai.whylabs.dataservice.structures.BulkLoadAuditEntry;
import ai.whylabs.dataservice.util.DatasourceConstants;
import ai.whylabs.dataservice.util.MicronautUtil;
import ai.whylabs.dataservice.util.ValidateRequest;
import com.amazonaws.services.s3.AmazonS3;
import com.amazonaws.services.s3.AmazonS3URI;
import com.google.common.base.Stopwatch;
import io.micrometer.core.annotation.Timed;
import io.micronaut.context.annotation.Requires;
import io.micronaut.context.annotation.Value;
import io.micronaut.core.io.Readable;
import io.micronaut.http.HttpResponse;
import io.micronaut.http.HttpStatus;
import io.micronaut.http.MediaType;
import io.micronaut.http.annotation.Body;
import io.micronaut.http.annotation.Controller;
import io.micronaut.http.annotation.PathVariable;
import io.micronaut.http.annotation.Put;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.io.IOException;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.*;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import javax.annotation.PostConstruct;
import javax.inject.Inject;
import javax.inject.Named;
import javax.sql.DataSource;
import javax.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import org.jetbrains.annotations.NotNull;

@Slf4j
@Tag(name = "Bulk", description = "Logic around bulk loading parquet, used for backfilling")
@Controller("/bulk")
@RequiredArgsConstructor
@Requires(property = "whylabs.dataservice.enableBackfill", value = "true")

/**
 * Flow [REST API or SQS consumer listening for triggers from the batch jobs: EventsJobV3,
 * SnapshotDatalake]:
 *
 * <p>1) Download S3 snapshot to EFS mount 2) Create parquet_fdw tmp table against snapshot 3)
 * Materialize parquet_dfw table into a view (faster than copying direct) 4) Load all data from view
 * into the real PG table
 */
public class BulkLoadController {

  public static final String SCHEMA = "whylabs";
  public static final String MONITOR_CONFIG_PREFIX = "parquet_monitor_config";
  public static final String ANALYZER_RUNS_PREFIX = "parquet_analyzer_runs";
  public static final String DELIMITER = "_";

  @Inject private AmazonS3 s3;
  @Inject private AnalysisService analysisService;
  @Inject private MonitorConfigService monitorConfigService;

  @Inject private AnalyzerRunRepository analyzerRunRepository;
  @Inject private AdminService adminService;
  @Inject private BulkLoadAuditRepository bulkLoadAuditRepository;
  @Inject private final DataSource dataSource;

  @Inject
  @Named(DatasourceConstants.BULK)
  private DataSource bulkDatasource;

  private String listFilesFunctionSql;
  private String importSqlTemplate;

  @PostConstruct
  public void start(
      @Value("classpath:sql/parquet_func_list_files.sql") Readable listFilesFunctionSqlReadable,
      @Value("classpath:sql/parquet_import_template.sql") Readable importSqlTemplateReadable)
      throws IOException {
    this.listFilesFunctionSql =
        MicronautUtil.getStringFromReadable(listFilesFunctionSqlReadable)
            .replace("$SCHEMA", SCHEMA);
    this.importSqlTemplate =
        MicronautUtil.getStringFromReadable(importSqlTemplateReadable).replace("$SCHEMA", SCHEMA);
  }

  @Put(uri = "/analyzerResults/{operation}", produces = MediaType.APPLICATION_JSON)
  public HttpResponse<ParquetIngestResponse> insertAnalyzerResults(
      @Body ParquetIngestionRequest request, @PathVariable PostgresBulkIngestionMode operation) {
    return ingestAnalyzerResults(
        request,
        operation,
        request.dedupeKey.isPresent() ? request.dedupeKey.get() : UUID.randomUUID());
  }

  @Put(uri = "/monitorConfig/{operation}", produces = MediaType.APPLICATION_JSON)
  public HttpResponse<ParquetIngestResponse> insertMonitorConfig(
      @Body ParquetIngestionRequest request, @PathVariable PostgresBulkIngestionMode operation)
      throws SQLException {
    return ingestMonitorConfig(
        request,
        operation,
        request.dedupeKey.isPresent() ? request.dedupeKey.get() : UUID.randomUUID());
  }

  @Timed("bukloadcontroller.ingest.analyzerruns")
  @Put(uri = "/analyzerRuns/{operation}", produces = MediaType.APPLICATION_JSON)
  public HttpResponse<ParquetIngestResponse> insertAnalyzerRuns(
      @Body ParquetIngestionRequest request, @PathVariable PostgresBulkIngestionMode operation)
      throws SQLException {
    return ingestAnalyzerRuns(
        request,
        operation,
        request.dedupeKey.isPresent() ? request.dedupeKey.get() : UUID.randomUUID());
  }

  @SneakyThrows
  @Timed("bukloadcontroller.ingest.analyzerresults")
  HttpResponse<ParquetIngestResponse> ingestAnalyzerResults(
      ParquetIngestionRequest request, PostgresBulkIngestionMode mode, UUID dedupeKey) {
    updateAuditTable(mode, dedupeKey.toString(), AnalysisService.HYPERTABLE_ANOMALIES);

    val s3Uri = new AmazonS3URI(request.path);
    val res = s3.listObjectsV2(s3Uri.getBucket(), s3Uri.getKey());
    List<String> keys = new ArrayList<>();
    for (val r : res.getObjectSummaries()) {
      if (r.getKey().endsWith(".txt")) {
        keys.add(r.getKey());
      }
    }
    CountDownLatch latch = new CountDownLatch(keys.size());
    log.info("Triggering async analyzer result ingestion for {} files", keys.size());
    for (val k : keys) {
      analysisService.loadFromJsonAsync(k, latch);
    }
    val success = latch.await(1, TimeUnit.HOURS);
    log.info("Analyzer result ingestion success: {}. Request: {}", success, request);
    if (success) {
      return HttpResponse.ok(new ParquetIngestResponse(null, request.runId, null, null, null));
    } else {
      return HttpResponse.status(HttpStatus.INTERNAL_SERVER_ERROR, "Ingestion timed out");
    }
  }

  @Timed("bukloadcontroller.ingest.monitorconfig")
  HttpResponse<ParquetIngestResponse> ingestMonitorConfig(
      ParquetIngestionRequest request, PostgresBulkIngestionMode mode, UUID dedupeKey)
      throws SQLException {
    updateAuditTable(mode, dedupeKey.toString(), MonitorConfigService.TABLE);

    val s3Uri = new AmazonS3URI(request.path);
    val tempTable = createTempTableFromParquet(dedupeKey.toString(), s3Uri, MONITOR_CONFIG_PREFIX);

    val schema = adminService.getSharedColumnSchema(MonitorConfigService.TABLE, tempTable);
    monitorConfigService.triggerBulkLoad(tempTable, schema, mode, dedupeKey.toString());

    return HttpResponse.ok(new ParquetIngestResponse(tempTable, request.runId, null, null, null));
  }

  @Timed("bukloadcontroller.ingest.analyzerruns")
  public HttpResponse<ParquetIngestResponse> ingestAnalyzerRuns(
      ParquetIngestionRequest request, PostgresBulkIngestionMode mode, UUID dedupeKey)
      throws SQLException {
    updateAuditTable(mode, dedupeKey.toString(), AnalyzerRunRepository.TABLE_NAME);
    val s3Uri = new AmazonS3URI(request.path);
    val res = s3.listObjectsV2(s3Uri.getBucket(), s3Uri.getKey());
    ValidateRequest.checkParquetSnapshot(res, request.getPath());

    val tempTable = createTempTableFromParquet(request.runId, s3Uri, ANALYZER_RUNS_PREFIX);
    val schema = adminService.getSharedColumnSchema(AnalyzerRunRepository.TABLE_NAME, tempTable);
    if (request.isAsync()) {
      analyzerRunRepository.triggerBulkLoadAsync(tempTable, schema, mode, dedupeKey.toString());
    } else {
      analyzerRunRepository.triggerBulkLoad(tempTable, schema, mode, dedupeKey.toString());
    }

    return HttpResponse.ok(new ParquetIngestResponse(tempTable, request.runId, null, null, null));
  }

  private void updateAuditTable(
      PostgresBulkIngestionMode mode, String dedupeKey, String tableName) {
    val audit =
        BulkLoadAuditEntry.builder()
            .id(dedupeKey)
            .start(System.currentTimeMillis())
            .status(BulkLoadStatus.started)
            .table(tableName)
            .mode(mode)
            .build();
    bulkLoadAuditRepository.save(audit);
  }

  @Transactional(rollbackOn = SQLException.class)
  public String createTempTableFromParquet(String runId, AmazonS3URI s3Uri, String prefix)
      throws SQLException {
    val postgresReadPath = Paths.get("/s3/delta/" + s3Uri.getKey());

    // Be aware there's a char limit on table names
    val tableName = String.join(DELIMITER, prefix, new Long(System.currentTimeMillis()).toString());
    String materializedView = materializedViewName(tableName);
    try (val con = dataSource.getConnection()) {
      con.setAutoCommit(false);
      val watch = Stopwatch.createStarted();
      try (val stmt = con.createStatement()) {
        loadParquetFdwTable(runId, postgresReadPath, tableName, stmt);

        try {
          /*
           * Copying data from a fdw directly into a parquet table performs like garbage. Much faster
           * to let PG materialize the parquet data into a view and copy from the view into the real
           * time.
           */
          String mat =
              "CREATE unlogged table whylabs."
                  + materializedView
                  + " as select * from whylabs."
                  + tableName;
          watch.reset();
          watch.start();
          log.info("Materializing {}", mat);
          stmt.setQueryTimeout(36000);
          // Note PG statement_timeout is in millis
          stmt.execute("set statement_timeout to 36000000");
          stmt.execute(mat);
          log.info("Materializing complete, took {} seconds", watch.elapsed().toMillis() / 1000.0);
        } catch (SQLException e) {
          log.error("Failed to execute load for run ID: {}", runId, e);
        }
      } catch (SQLException e) {
        log.error("Failed to execute load for run ID: {}", runId, e);
        con.rollback();
        throw e;
      }
    }
    return tableName;
  }

  @SuppressWarnings({"SqlResolve", "SqlNoDataSourceInspection"})
  private void loadParquetFdwTable(
      String runId, //
      Path postgresReadPath, //
      String tableName, //
      Statement stmt)
      throws SQLException {
    stmt.execute(listFilesFunctionSql);
    String dropTableStmt =
        "DROP FOREIGN TABLE IF EXISTS $SCHEMA.\"$TABLE\" CASCADE"
            .replace("$TABLE", tableName)
            .replace("$SCHEMA", SCHEMA);
    stmt.execute(dropTableStmt);
    val importSql =
        this.importSqlTemplate
            .replace("$TABLE", tableName)
            .replace("$PATH", postgresReadPath.toString());
    log.info("Importing table for run ID: {}. Statement: {}", runId, importSql);
    stmt.execute(importSql);
    log.info("Loaded snapshot for run ID {} into foreign table {}", runId, tableName);
  }

  @NotNull
  public static String materializedViewName(@NotNull String tableName) {
    return "materialized_" + tableName;
  }
}
