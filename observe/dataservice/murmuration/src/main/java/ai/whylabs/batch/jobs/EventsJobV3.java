package ai.whylabs.batch.jobs;

import static ai.whylabs.druid.whylogs.column.WhyLogsRow.DATASET_ID;
import static org.apache.spark.sql.functions.broadcast;
import static org.apache.spark.sql.functions.callUDF;
import static org.apache.spark.sql.functions.col;
import static org.apache.spark.sql.functions.expr;
import static org.apache.spark.sql.functions.first;
import static org.apache.spark.sql.functions.lit;

import ai.whylabs.batch.MapFunctions.*;
import ai.whylabs.batch.aggregators.AnalysisUdaf;
import ai.whylabs.batch.aggregators.StringArraySetMergeUdaf;
import ai.whylabs.batch.jobs.base.AbstractSparkJob;
import ai.whylabs.batch.sinks.PostgresBulkIngestionTriggerSink;
import ai.whylabs.batch.sinks.SirenSqsDigestSinkForeach;
import ai.whylabs.batch.sinks.SirenSqsEveryAnomalySinkForeach;
import ai.whylabs.batch.udfs.AddYearMonthDay;
import ai.whylabs.batch.udfs.DeriveUUID;
import ai.whylabs.batch.utils.*;
import ai.whylabs.core.collectors.MonitorConfigInMemoryRepo;
import ai.whylabs.core.configV3.structure.MonitorConfigV3Row;
import ai.whylabs.core.enums.*;
import ai.whylabs.core.structures.*;
import ai.whylabs.core.structures.monitor.events.AnalyzerResult;
import ai.whylabs.core.structures.monitor.events.AnalyzerResult.Fields;
import ai.whylabs.core.utils.JacksonSerializeBooleanAsPrimitive;
import ai.whylabs.druid.whylogs.streaming.S3ContentFetcher;
import com.amazonaws.services.s3.AmazonS3URI;
import com.beust.jcommander.Parameter;
import com.fasterxml.jackson.core.JsonFactory;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.module.SimpleModule;
import com.google.common.collect.ImmutableList;
import io.delta.tables.DeltaTable;
import java.io.ByteArrayInputStream;
import java.io.File;
import java.nio.file.Files;
import java.time.DayOfWeek;
import java.time.ZonedDateTime;
import java.time.temporal.ChronoUnit;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import org.apache.spark.sql.Dataset;
import org.apache.spark.sql.Encoders;
import org.apache.spark.sql.Row;
import org.apache.spark.sql.SaveMode;
import org.apache.spark.sql.functions;
import org.apache.spark.sql.types.DataTypes;

@Slf4j
@Setter
public class EventsJobV3 extends AbstractSparkJob {

  @Parameter(
      names = "-debugMode",
      description = "Disable all sinks, don't pick up any backfill requests")
  private Boolean debugMode = false;

  @Parameter(
      names = "-analyzerResultsPath",
      description =
          "If set, we will output the events data in the structure we send to druid to the specified path",
      required = true)
  protected String analyzerResultsPath;

  @Parameter(
      names = "-analyzerRuns",
      description =
          "If set, we will output metadata about each analyzer run and individual errors with bad configurations",
      required = false)
  protected String analyzerRuns;

  @Parameter(
      names = "-overwriteEvents",
      description =
          "By default event+alert output is immutable, but when debugging or rolling out a critical bugfix you may want to ignore immutability and rewrite that druid data. This option will also force image generation irregardless of how hold the data is to make testing easier.")
  private Boolean overwriteEvents = false;

  @Parameter(
      names = "-forceLatestConfigVersion",
      description =
          "Generally we backfill using the config as it looked for the dataset timestamp of the target batch, but if you need to overwriteEvents and force it to use the latest config this flag is for you!")
  private Boolean forceLatestConfigVersion = true;

  @Parameter(
      names = "-skipManifestGeneration",
      description =
          "Datalakes can generate a symlink manifest which you use when querying from Athena, but it adds some time to the job so we wanna skip during unit tests")
  private Boolean skipManifestGeneration = false;

  @Parameter(
      names = "-s3SnapshotStagingArea",
      description =
          "A temp location (typically S3) for files to be ingested for druid (events). Note, our infra code puts an S3 lifecycle on these snapshots so they don't stick around forever.",
      required = false)
  protected String s3SnapshotStagingArea;

  @Parameter(
      names = "-monitorsConfigV3",
      description = "Path of the deltalake table for monitor config data",
      required = true)
  protected String monitorsConfigV3;

  @Parameter(
      names = "-orgId",
      description =
          "Target org ID to filter data by. Useful when targeting specific organization(s).  May be supplied more than once to target multiple organizations.")
  protected List<String> orgIds;

  @Parameter(
      names = "-nearRealTimeAlertSqsTopic",
      description =
          "Name of an SQS topic to publish near real time alerts for this current job run",
      required = false)
  protected String nearRealTimeAlertSqsTopic;

  @Parameter(
      names = "-sirenV2AlertSqsTopic",
      description =
          "Name of an SQS topic to publish near real time alerts for this current job run for siren v2",
      required = false)
  protected String sirenV2AlertSqsTopic;

  @Parameter(
      names = "-datasetId",
      description =
          "Target dataset ID to filter the data by. Useful when working with a single dataset ID. Intended to be used only with single -orgId parameter.")
  protected String datasetId;

  @Parameter(
      names = "-embedableImageBasePath",
      description = "Where to sink embeddable images of anomalies",
      required = false)
  String embedableImageBasePath;

  @Parameter(
      names = "-sirenDigestDatalake",
      description =
          "We sink the digests we send out to a deltalake in case we need to investigate an issue",
      required = false)
  String sirenDigestDatalake;

  @Parameter(
      names = "-sirenEveryAnomalyDatalake",
      description =
          "We sink the every anomaly payloads to a deltalake in case we need to investigate an issue",
      required = false)
  String sirenEveryAnomalyDatalake;

  @Parameter(
      names = {"-postgresBulkIngestionTriggerTopic"},
      description = "Kinesis topic to notify its time for a bulk insert")
  private String postgresBulkIngestionTriggerTopic;

  @Parameter(
      names = "-profilesDatalakeV2",
      description = "Output location of the v2 profiles datalake")
  private String profilesDatalakeV2;

  @Parameter(
      names = "-configRepo",
      description =
          "Temp location of a file with the latest monitor configs that we use to sidechain broadcast out to the cluster because joins are too expensive")
  protected String configRepo = "/tmp/config_" + UUID.randomUUID();

  @Parameter(
      names = {"-individualProfileMonitoringMode"},
      description = "Flag to scope this monitor run to strictly individual profile analyzers")
  private boolean individualProfileMonitoringMode = false;

  @Parameter(
      names = {"-skipAnalyzer"},
      description = "Name analyzer types to skip")
  private String skipAnalyzer;

  public static final String DERIVED_PREFIX = "whylogs.metrics.derived.";
  public static final String DELTA = "delta";
  public static final String INNER_JOIN = "inner";
  public static final String oldestDataTsWrittenInTheLastWeekCol =
      "oldestDataTsWrittenInTheLastWeek";
  public static final String mostRecentDatasetTs = "newestDataTsWritten";
  public static final String mostRecentDatasetDatalakeWriteTs = "newestProfileTsWritten";
  public static final String RUN_ID = "runId";
  private static final String EXPLODED_MONITOR_ID = "explodedMonitorId";
  public static final String LEFT_JOIN = "left";
  private Long startedTs = System.currentTimeMillis();

  protected Dataset<MonitorConfigV3Row> monitorsV3Df;
  protected Dataset<Row> profilesTable;

  public static final String SYMLINK_MANIFEST = "symlink_format_manifest";

  public static final DeltalakeMergeCondition DRUID_EVENTS_MERGE_CONDITION =
      DeltalakeMergeCondition.builder().field(AnalyzerResult.Fields.id).build();
  private static final String mergeMonitorIdsUdf = "mergeMonitorIds";
  @Getter private Dataset<SirenEveryAnomalyPayload> everyAnomalySirenDf;
  @Getter private Dataset<SirenDigestPayload> digestSirenPayloadDf;

  public static void main(String[] args) {
    new EventsJobV3().run(args);
  }

  @Override
  public void apply(String[] args) {
    super.apply(args);

    if (overwriteEvents) {
      // Cannot overwrite events using append mode, you've gotta use a rebuild the world strategy
      // writing to druid
      /* TODO: We need to sort out a better primary key if we stabilize our runids so
        that we have a good way to upsert deltalake records.

        // Overrides are manually triggered, get a unique runId each time
        runId = UUID.randomUUID().toString();
      } else {
        // Stabilize the runId to the currentTime
        runId =
            UUID.nameUUIDFromBytes(currentTime.toString().getBytes(StandardCharsets.UTF_8))
                .toString();

         */
    }
  }

  @SneakyThrows
  @Override
  public void runBefore() {
    super.runBefore();
    if (currentTimestamp.isAfter(ZonedDateTime.now().plusDays(2))) {
      throw new IllegalArgumentException(
          "Running the job with a future currentTimestamp is going to generate a bunch of missing data alerts for customers. Are you sure you wanna do that?");
    }

    if (!sparkMaster.startsWith("local")
        && EmrConcurrencyCheck.isEventJobRunningOnMultipleClusters()) {
      log.warn(
          "Events job detected running on another cluster. Exiting to prevent duplicate analysis generation");
      System.exit(0);
    }
    if (sparkMaster.startsWith("local")) {
      spark.sparkContext().setCheckpointDir("/tmp/spark/checkpoint");
    } else {
      spark.sparkContext().setCheckpointDir("hdfs:///user/spark/checkpoint");
    }
  }

  private void kickDatalakeCompactions() {
    log.info("Hour day {}, {}", currentTimestamp.getHour(), currentTimestamp.getDayOfWeek());
    if (!sparkMaster.startsWith("local")
        && currentTimestamp.getHour() == 0
        && currentTimestamp.getDayOfWeek().equals(DayOfWeek.SATURDAY)) {
      log.info("Kicking weekly compaction process");
      val job = new FullCompactionJob();
      val args =
          ImmutableList.of(
                  "-sparkMaster",
                  "local[*]",
                  "-profilesDatalakeV2",
                  profilesDatalakeV2,
                  "-analyzerRuns",
                  analyzerRuns,
                  "-analyzerResultsPath",
                  analyzerResultsPath,
                  "-sirenDigestDatalake",
                  sirenDigestDatalake,
                  "sirenEveryAnomalyDatalake",
                  sirenEveryAnomalyDatalake)
              .toArray(new String[0]);
      job.run(args);
      log.info("Weekly is complete");
    }
  }

  @Override
  public void runAfter(Dataset<Row> result) {
    if (result != null) {
      val events = result.as(Encoders.bean(AnalyzerResult.class)).checkpoint();

      if (events.isEmpty()) {
        log.warn("No events produced, are we sure this job was configured correctly?. Exiting");
        return;
      }

      if (debugMode) {
        return;
      }

      materializeEventsAndAlerts(events);
      sinkAnalysisToPostgres();
      sinkDigestsSiren();
      sinkAnomaliesToSiren();

    } else {
      log.warn("Received null results");
    }

    log.info("EventsJob completed successfully");
    // Run datalake compactions after the real work has completed
    kickDatalakeCompactions();
  }

  @SneakyThrows
  public Dataset<MonitorConfigV3Row> cacheMonitorConfig() {
    if (monitorsV3Df == null) {
      log.info("monitorsV3Df is null. Computing run ID {}", runId);
      val monitorTable = DeltaTable.forPath(spark, monitorsConfigV3);

      // val version = monitorTable.history(1).select("version").collectAsList().get(0).getLong(0);
      // log.info("Using monitor table version: {}", version);
      Dataset<Row> df = monitorTable.toDF();

      if (orgIds != null) {
        log.info("Filtering table by org {}", orgIds);
        df = df.filter(col(MonitorConfigV3Row.Fields.orgId).isin(orgIds.toArray()));
      }
      if (datasetId != null) {
        df = df.filter(col(MonitorConfigV3Row.Fields.datasetId).equalTo(datasetId));
      }

      monitorsV3Df = df.as(Encoders.bean(MonitorConfigV3Row.class));

      // Run validation against the latest config and report up any errors to a druid row
      monitorsV3Df.registerTempTable("confs");
      // Grab the latest, we can get into versioned backfills later, that's a hard problem
      monitorsV3Df =
          monitorsV3Df
              .sqlContext()
              .sql(
                  "select * from (select *, row_number() OVER (PARTITION BY orgId, datasetId ORDER BY updatedTs DESC) as rn from confs) tmp where rn = 1")
              .as(Encoders.bean(MonitorConfigV3Row.class));
      if (individualProfileMonitoringMode) {
        monitorsV3Df =
            monitorsV3Df.flatMap(
                new MonitorConfigScopeToIndividualProfileAnalyzers(),
                Encoders.bean(MonitorConfigV3Row.class));
      }

      val validationErrors =
          monitorsV3Df.flatMap(
              new MonitorConfigValidationCheckToMonitorRun(
                  currentTimestamp, runId, forceLatestConfigVersion),
              Encoders.bean(AnalyzerRun.class));

      val failCount = validationErrors.count();
      if (failCount > 0 && analyzerRuns != null) {
        // validationErrors.show();
        log.info("validationErrors {}", failCount);
        // Hold off on the druid task until the runs from after the calculations make it in
        sinkMonitorRuns(validationErrors, false);
      }

      // remove any invalid analyzers from consideration
      monitorsV3Df =
          monitorsV3Df.flatMap(
              new MonitorConfigValidationCheckFilter(currentTimestamp),
              Encoders.bean(MonitorConfigV3Row.class));

      // remove any skipped analyzers from consideration
      if (skipAnalyzer != null) {
        monitorsV3Df =
            monitorsV3Df.flatMap(
                new MonitorConfigSkipAnalyzers(skipAnalyzer),
                Encoders.bean(MonitorConfigV3Row.class));
      }

      val repo = new MonitorConfigInMemoryRepo();
      for (val conf : monitorsV3Df.collectAsList()) {
        repo.add(conf);
      }

      if (configRepo.startsWith("s3")) {
        AmazonS3URI s3URI = new AmazonS3URI(configRepo);
        new S3ContentFetcher()
            .getS3Client()
            .putObject(
                s3URI.getBucket(), s3URI.getKey(), new ByteArrayInputStream(repo.toBytes()), null);
      } else {
        Files.write(new File(configRepo).toPath(), repo.toBytes());
      }
    }
    monitorsV3Df = monitorsV3Df.checkpoint();

    return monitorsV3Df;
  }

  private void sinkMonitorRuns(Dataset<AnalyzerRun> runs, boolean submitDruidTask) {
    if (analyzerRuns == null || s3SnapshotStagingArea == null) {
      log.warn(
          "Unable to sink metadata about analyzer runs because the config isn't provided 'analyzerRuns' or 's3SnapshotStagingArea'");
      return;
    }

    // Deltalake
    runs.toDF().write().format(DELTA).mode(SaveMode.Append).save(analyzerRuns);

    if (!s3SnapshotStagingArea.endsWith("/")) {
      s3SnapshotStagingArea = s3SnapshotStagingArea + "/";
    }

    Dataset<Row> df =
        DeltaTable.forPath(spark, analyzerRuns)
            .toDF()
            .filter(col(AnalyzerRun.Fields.runId.name()).equalTo(lit(runId)));

    // Postgres
    if (postgresBulkIngestionTriggerTopic != null) {
      val analyzerRunsSnapshot =
          s3SnapshotStagingArea + "postgres_snapshot_monitor_runs/" + UUID.randomUUID() + "/";
      if (df.count() == 0) {
        log.info("No new analyzer runs, skipping postgres sink");
        return;
      }

      SnapshotDeltalake.transformAnalyzerRunsToPostgresFriendlyBulkloadFormat(spark, df)
          .toDF()
          .write()
          .format("parquet")
          .save(analyzerRunsSnapshot);
      new PostgresBulkIngestionTriggerSink(postgresBulkIngestionTriggerTopic)
          .send(
              Arrays.asList(
                  PostgresBulkIngestionTrigger.builder()
                      .path(analyzerRunsSnapshot)
                      .requestedTs(System.currentTimeMillis())
                      .jobRunCurrentTime(currentTimestamp.toInstant().toEpochMilli())
                      .async(false)
                      .runId(runId)
                      .targetTable(TargetTable.ANALYZER_RUNS)
                      .mode(PostgresBulkIngestionMode.insert)
                      .build()));
    }
  }

  public Dataset<Row> getV2ProfilesTable() {
    Dataset<Row> profilesTablev1 =
        DeltaTable.forPath(spark, profilesDatalakeV2)
            .toDF()
            // Granular data has already been monitored, that happens at write time
            .filter(col(DatalakeRowV2.Fields.enableGranularDataStorage).notEqual(lit(true))) /*
            .filter(
                col(DatalakeRowV1.Fields.orgId)
                    .equalTo("org-5sDdCa")
                    .or(col(DatalakeRowV1.Fields.orgId).equalTo("org-7wNpPp"))
                    .or(col(DatalakeRowV1.Fields.orgId).equalTo("org-9rXVqf"))
                    .or(col(DatalakeRowV1.Fields.orgId).equalTo("org-rffTaS")))*/;

    if (orgIds != null) {
      log.info("Filtering table by org {}", orgIds);
      profilesTablev1 =
          profilesTablev1.filter(col(DatalakeRow.Fields.orgId).isin(orgIds.toArray()));
    }
    if (datasetId != null) {
      profilesTablev1 = profilesTablev1.filter(col(DATASET_ID).equalTo(datasetId));
    }

    return profilesTablev1;
  }

  private void materializeEventsAndAlerts(Dataset<AnalyzerResult> monitorEvents) {
    final ObjectMapper MAPPER = new ObjectMapper(new JsonFactory());
    val sm = new SimpleModule();
    sm.addSerializer(new JacksonSerializeBooleanAsPrimitive());
    MAPPER.registerModule(sm);

    /**
     * Dump events+alerts into deltalake first. This middle hop enables us to run ad-hoc backfills
     * without loosing immutability of data we've already written to druid.
     */
    log.info("Updating analysis data {}, update mode {}", analyzerResultsPath, overwriteEvents);

    String updatingAnalysisId = "updatingAnalysisId";

    if (DeltalakeWriter.doesTableExist(analyzerResultsPath)) {
      val previousLatest =
          DeltaTable.forPath(spark, analyzerResultsPath)
              .toDF()
              .filter(col(Fields.latest).equalTo(lit(true)))
              .drop(col(Fields.latest))
              .dropDuplicates("id");
      // Any newer version of an analysis needs to mark the older version as no longer the latest
      val upsertsDf =
          monitorEvents.select(monitorEvents.col(Fields.analysisId).as(updatingAnalysisId));
      val previousUnflagged =
          previousLatest
              .join(
                  upsertsDf,
                  upsertsDf.col(updatingAnalysisId).equalTo(previousLatest.col(Fields.analysisId)),
                  INNER_JOIN)
              .withColumn(Fields.latest, lit(false))
              .drop(updatingAnalysisId);

      val combined = new DatasetUnionHelper(Arrays.asList(previousUnflagged, monitorEvents.toDF()));

      DeltalakeWriter.builder()
          .dataset(combined.getUnion())
          .mergeCondition(DRUID_EVENTS_MERGE_CONDITION)
          .path(analyzerResultsPath)
          .updateExisting(overwriteEvents)
          .partitionField(Fields.yyyymmdd)
          .build()
          .execute();
    } else {
      // monitorEvents.toDF().show();
      // First run
      DeltalakeWriter.builder()
          .dataset(monitorEvents.toDF())
          .mergeCondition(DRUID_EVENTS_MERGE_CONDITION)
          .path(analyzerResultsPath)
          .updateExisting(overwriteEvents)
          .partitionField(Fields.yyyymmdd)
          .build()
          .execute();
    }
    if (!skipManifestGeneration) {
      /**
       * Generate a symlink manifest to make this deltalake table friendly to presto/trino/athena.
       * This operation slows down unit tests and is only useful for prod, so we skip it most of the
       * time.
       *
       * <p>https://docs.delta.io/latest/presto-integration.html
       *
       * <p>Commented out b/c you can, well, query postgres
       */
      // DeltaTable.forPath(spark, analyzerResultsPath).generate(SYMLINK_MANIFEST);
    }

    spark
        .udf()
        .register(
            mergeMonitorIdsUdf, functions.udaf(new StringArraySetMergeUdaf(), Encoders.STRING()));

    spark.udf().register(DeriveUUID.COL, functions.udf(new DeriveUUID(), DataTypes.StringType));

    long completed = System.currentTimeMillis();
    val newlyMintedMonitorRuns =
        DeltaTable.forPath(spark, analyzerResultsPath)
            .toDF()
            .filter(col(AnalyzerResult.Fields.runId).equalTo(lit(runId)))
            .groupBy(
                col(AnalyzerResult.Fields.orgId).as(AnalyzerRun.Fields.orgId.name()),
                col(Fields.datasetId).as(AnalyzerRun.Fields.datasetId.name()),
                col(Fields.analyzerVersion).as(AnalyzerRun.Fields.analyzerVersion.name()),
                col(Fields.analyzerId).as(AnalyzerRun.Fields.analyzerId.name()))
            .agg(
                functions
                    .max(col(Fields.baselineBatchesWithProfileCount))
                    .as(AnalyzerRun.Fields.baselineBatchesWithProfileCount.name()),
                functions
                    .max(col(Fields.targetBatchesWithProfileCount))
                    .as(AnalyzerRun.Fields.targetBatchesWithProfileCount.name()),
                functions.sum(col(Fields.anomalyCount)).as(AnalyzerRun.Fields.anomalies.name()),
                // functions.array_distinct(col(Fields.monitorIds)).as(Fields.monitorIds),
                functions
                    .countDistinct(col(Fields.segment))
                    .as(AnalyzerRun.Fields.segmentsAnalyzed.name()),
                functions
                    .countDistinct(col(Fields.column))
                    .as(AnalyzerRun.Fields.columnsAnalyzed.name()),
                functions
                    .split(
                        callUDF(
                            mergeMonitorIdsUdf,
                            functions.array_join(
                                col(Fields.monitorIds), StringArraySetMergeUdaf.DELIMETER)),
                        StringArraySetMergeUdaf.DELIMETER)
                    .as(Fields.monitorIds),
                functions
                    .collect_set(col(Fields.failureType))
                    .as(AnalyzerRun.Fields.failureTypes.name()))
            .withColumn(AnalyzerRun.Fields.runId.name(), lit(runId))
            .withColumn(AnalyzerRun.Fields.completedTs.name(), lit(completed))
            .withColumn(AnalyzerRun.Fields.createdTs.name(), lit(completed))
            .withColumn(AnalyzerRun.Fields.startedTs.name(), lit(startedTs))
            .withColumn(AnalyzerRun.Fields.status.name(), lit(MonitorRunStatus.COMPLETED.name()))
            .withColumn(
                AnalyzerRun.Fields.internalErrorMessage.name(),
                lit(null).cast(DataTypes.StringType))
            .withColumn(
                AnalyzerRun.Fields.forceLatestConfigVersion.name(), lit(forceLatestConfigVersion))
            .withColumn(AnalyzerRun.Fields.customerRequestedBackfill.name(), lit(false))
            .withColumn(
                AnalyzerRun.Fields.id.name(),
                callUDF(
                    DeriveUUID.COL,
                    col(AnalyzerRun.Fields.orgId.name()),
                    col(AnalyzerRun.Fields.datasetId.name()),
                    col(AnalyzerRun.Fields.runId.name()),
                    col(AnalyzerRun.Fields.analyzerId.name())))
            .as(Encoders.bean(AnalyzerRun.class));
    // newlyMintedMonitorRuns.show();

    sinkMonitorRuns(newlyMintedMonitorRuns, true);
  }

  private ZonedDateTime getEndOfDruidRebuildWindow() {
    // 9-20T:12 truncates to 9-20T:00, so add 1d to include hourly
    return currentTimestamp.plusDays(1).truncatedTo(ChronoUnit.DAYS);
  }

  /*
  Can't go any more granular than the druid segment (ingestion) granularity or you end
  up doing partial replacements of a time range.
  */

  private ZonedDateTime getStartOfDruidRebuildWindow() {
    return currentTimestamp.minusYears(2).truncatedTo(ChronoUnit.DAYS);
  }

  public void sinkAnalysisToPostgres() {
    // Re-using the old druid prefix b/c it already has s3 retention rules in place
    if (!s3SnapshotStagingArea.endsWith("/")) {
      s3SnapshotStagingArea = s3SnapshotStagingArea + "/";
    }
    val pgSnapshotLocation =
        s3SnapshotStagingArea + "analyzer_results_pg_snapshot/" + UUID.randomUUID() + "/";

    Dataset<Row> df =
        DeltaTable.forPath(spark, analyzerResultsPath)
            .toDF()
            .filter(col(Fields.runId).equalTo(lit(runId)))
            .filter(col(AnalyzerResult.Fields.latest).equalTo(lit(true)));
    if (df.isEmpty()) {
      log.info("No new analyzer results, skipping postgres sink");
      return;
    }
    log.info("Snapshotting analysis for postgres to {}", pgSnapshotLocation);
    spark
        .udf()
        .register(
            AddYearMonthDay.UDF_NAME, functions.udf(new AddYearMonthDay(), DataTypes.StringType));

    FillMissingColumns.fillMissingColumnsWitNulls(df, AnalyzerResult.class.getDeclaredFields())
        .drop(col(AnalyzerResult.Fields.yyyymmdd))
        .withColumn(
            AnalyzerResult.Fields.yyyymmdd,
            callUDF(AddYearMonthDay.UDF_NAME, col(AnalyzerResult.Fields.datasetTimestamp)))
        // Repartitioning is important to reduce lock contention during ingestion
        .repartition(100, col(AnalyzerResult.Fields.yyyymmdd), col(AnalyzerResult.Fields.datasetId))
        .as(Encoders.bean(AnalyzerResult.class))
        // Sorting here helps the data get ingested into PG in a more optimally packed manner
        .sortWithinPartitions(
            col(AnalyzerResult.Fields.orgId),
            col(AnalyzerResult.Fields.datasetId),
            col(AnalyzerResult.Fields.segment),
            col(AnalyzerResult.Fields.column))
        .mapPartitions(new AnalyzerResultToJson(), Encoders.STRING())
        .write()
        .text(pgSnapshotLocation);

    if (postgresBulkIngestionTriggerTopic == null) {
      log.info(
          "Must populate parameter for postgresBulkIngestionTriggerSqs in order to create a monitor event snapshot on disk for postgres. Writing to postgres will be a no-op");
      return;
    }

    new PostgresBulkIngestionTriggerSink(postgresBulkIngestionTriggerTopic)
        .send(
            Arrays.asList(
                PostgresBulkIngestionTrigger.builder()
                    .path(pgSnapshotLocation)
                    .requestedTs(System.currentTimeMillis())
                    .jobRunCurrentTime(currentTimestamp.toInstant().toEpochMilli())
                    .runId(runId)
                    .async(false)
                    .targetTable(TargetTable.ANALYZER_RESULTS)
                    .mode(PostgresBulkIngestionMode.insert)
                    .build()));
  }

  public void sinkAnomaliesToSiren() {
    Dataset<AnalyzerResult> analyzerResults =
        DeltaTable.forPath(spark, analyzerResultsPath)
            .toDF()
            .filter(col(Fields.runId).equalTo(lit(runId)))
            .filter(col(Fields.latest).equalTo(lit(true)))
            .filter(col(Fields.orgId).isNotNull())
            .filter(col(Fields.anomalyCount).$greater(lit(0l)))
            .as(Encoders.bean(AnalyzerResult.class));
    val configDF = cacheMonitorConfig();

    // Notify Siren for every anomaly mode
    val everyAnomaly =
        analyzerResults.joinWith(
            broadcast(configDF),
            analyzerResults
                .col(Fields.orgId)
                .equalTo(configDF.col(MonitorConfigV3Row.Fields.orgId))
                .and(
                    analyzerResults
                        .col(Fields.datasetId)
                        .equalTo(configDF.col(MonitorConfigV3Row.Fields.datasetId))),
            INNER_JOIN);

    everyAnomalySirenDf =
        everyAnomaly
            .flatMap(
                new EveryAnomalyModeFilter(runId), Encoders.bean(SirenEveryAnomalyPayload.class))
            // Spread the load out a bit when hitting SQS
            .repartition(50)
            .checkpoint();

    // everyAnomalySirenDf.show();
    // log.info(new SirenEventSerde().toJsonString(everyAnomalySirenDf.collectAsList().get(0)));
    if (nearRealTimeAlertSqsTopic != null) {
      everyAnomalySirenDf.foreachPartition(
          new SirenSqsEveryAnomalySinkForeach(nearRealTimeAlertSqsTopic));
    }
    if (sirenV2AlertSqsTopic != null) {
      everyAnomalySirenDf.foreachPartition(
          new SirenSqsEveryAnomalySinkForeach(sirenV2AlertSqsTopic));
    }

    if (sirenEveryAnomalyDatalake != null) {
      everyAnomalySirenDf
          .toDF()
          .coalesce(10)
          .withColumn("ts", lit(new Long(currentTimestamp.toInstant().toEpochMilli())))
          .write()
          .format(DELTA)
          .mode(SaveMode.Append)
          .save(sirenEveryAnomalyDatalake);
      if (!skipManifestGeneration) {
        /**
         * Generate a symlink manifest to make this deltalake table friendly to presto/trino/athena.
         * This operation slows down unit tests and is only useful for prod, so we skip it most of
         * the time.
         *
         * <p>https://docs.delta.io/latest/presto-integration.html
         */
        DeltaTable.forPath(spark, sirenEveryAnomalyDatalake).generate(SYMLINK_MANIFEST);
      }
    }
  }

  public void sinkDigestsSiren() {
    log.info("Sinking digests for runId {}", runId);
    Dataset<AnalyzerResult> analyzerResults =
        DeltaTable.forPath(spark, analyzerResultsPath)
            .toDF()
            // .filter(col(Fields.runId).equalTo(lit(runId)))
            .filter(col(Fields.latest).equalTo(lit(true)))
            .filter(col(Fields.orgId).isNotNull())
            .filter(col(Fields.datasetTimestamp).isNotNull())
            .as(Encoders.bean(AnalyzerResult.class))
            .as("analyzerResults");

    // analyzerResults.show(100);

    // Grab monitor config
    val configDF = cacheMonitorConfig();

    // Extract digest monitors so each monitor has 1 row in the DF
    val digests =
        broadcast(configDF)
            .flatMap(
                new MonitorConfigRowToDigests(currentTimestamp), Encoders.bean(MonitorDigest.class))
            .as("digest");

    // Join digests to analyzer results
    val joined =
        digests.joinWith(
            analyzerResults,
            expr(
                "array_contains(analyzerIds, analyzerId) and analyzerResults.datasetId = digest.datasetId and analyzerResults.orgId = digest.orgId"),
            INNER_JOIN);

    // Filter down to anomalies based on filtering supplied in the monitor config
    val filteredAnalyzerResults =
        joined
            .flatMap(
                new DigestModeAnomalyFilter(currentTimestamp, runId),
                Encoders.bean(MonitorDigestFiltered.class))
            .checkpoint();
    // filteredAnalyzerResults.show();

    // Generate segment statistics
    val segmentAnomalyStatistics =
        filteredAnalyzerResults
            .filter(col(Fields.anomalyCount).$greater(lit(0l)))
            .groupBy(
                MonitorDigestFiltered.Fields.orgId,
                MonitorDigestFiltered.Fields.datasetId,
                MonitorDigestFiltered.Fields.monitorId,
                MonitorDigestFiltered.Fields.segment,
                MonitorDigestFiltered.Fields.analyzerType)
            .agg(
                functions
                    .max(col(MonitorDigestFiltered.Fields.datasetTimestamp))
                    .as(ColumnStatisticGrouped.Fields.oldestAnomalyDatasetTimestamp),
                functions
                    .min(col(MonitorDigestFiltered.Fields.datasetTimestamp))
                    .as(ColumnStatisticGrouped.Fields.earliestAnomalyDatasetTimestamp),
                functions
                    .sum(functions.col(MonitorDigestFiltered.Fields.anomalyCount))
                    .as(SirenDigestPayload.Fields.numAnomalies),
                functions
                    .collect_set(MonitorDigestFiltered.Fields.column)
                    .as(SegmentStatisticGrouped.Fields.columns))
            .groupBy(
                MonitorDigestFiltered.Fields.orgId,
                MonitorDigestFiltered.Fields.datasetId,
                MonitorDigestFiltered.Fields.monitorId)
            .agg(
                functions
                    .max(col(ColumnStatisticGrouped.Fields.oldestAnomalyDatasetTimestamp))
                    .as(ColumnStatisticGrouped.Fields.oldestAnomalyDatasetTimestamp),
                functions
                    .min(col(ColumnStatisticGrouped.Fields.earliestAnomalyDatasetTimestamp))
                    .as(ColumnStatisticGrouped.Fields.earliestAnomalyDatasetTimestamp),
                functions
                    .collect_list(SegmentStatisticGrouped.Fields.columns)
                    .as(SegmentStatisticGrouped.Fields.columns),
                functions
                    .collect_list(MonitorDigestFiltered.Fields.analyzerType)
                    .as(ColumnStatisticGrouped.Fields.analyzerType),
                functions
                    .collect_list(MonitorDigestFiltered.Fields.segment)
                    .as(SegmentStatisticGrouped.Fields.segments),
                functions
                    .collect_list(SirenDigestPayload.Fields.numAnomalies)
                    .as(SegmentStatisticGrouped.Fields.numAnomalies))
            .as(Encoders.bean(SegmentStatisticGrouped.class))
            .map(
                new SegmentStatisticGroupedToSirenDigestPayload(runId),
                Encoders.bean(SirenDigestPayload.class));

    // Generate statistics on individual column + analyzer type combinations
    Dataset<SirenDigestPayload> columnAnomalyStatistics =
        filteredAnalyzerResults
            .filter(col(Fields.anomalyCount).$greater(lit(0l)))
            .groupBy(
                MonitorDigestFiltered.Fields.orgId,
                MonitorDigestFiltered.Fields.datasetId,
                MonitorDigestFiltered.Fields.monitorId,
                MonitorDigestFiltered.Fields.column,
                MonitorDigestFiltered.Fields.analyzerType)
            .agg(
                functions
                    .max(col(MonitorDigestFiltered.Fields.datasetTimestamp))
                    .as(ColumnStatisticGrouped.Fields.oldestAnomalyDatasetTimestamp),
                functions
                    .min(col(MonitorDigestFiltered.Fields.datasetTimestamp))
                    .as(ColumnStatisticGrouped.Fields.earliestAnomalyDatasetTimestamp),
                functions
                    .sum(col(MonitorDigestFiltered.Fields.anomalyCount))
                    .as(SirenDigestPayload.Fields.numAnomalies))
            .groupBy(
                MonitorDigestFiltered.Fields.orgId,
                MonitorDigestFiltered.Fields.datasetId,
                MonitorDigestFiltered.Fields.monitorId)
            .agg(
                functions
                    .max(col(ColumnStatisticGrouped.Fields.oldestAnomalyDatasetTimestamp))
                    .as(ColumnStatisticGrouped.Fields.oldestAnomalyDatasetTimestamp),
                functions
                    .min(col(ColumnStatisticGrouped.Fields.earliestAnomalyDatasetTimestamp))
                    .as(ColumnStatisticGrouped.Fields.earliestAnomalyDatasetTimestamp),
                functions
                    .collect_list(MonitorDigestFiltered.Fields.analyzerType)
                    .as(ColumnStatisticGrouped.Fields.analyzerType),
                functions
                    .collect_list(MonitorDigestFiltered.Fields.column)
                    .as(ColumnStatisticGrouped.Fields.columns),
                functions
                    .collect_list(SirenDigestPayload.Fields.numAnomalies)
                    .as(ColumnStatisticGrouped.Fields.numAnomalies))
            .as(Encoders.bean(ColumnStatisticGrouped.class))
            .map(
                new ColumnStatisticGroupedToSirenDigestPayload(runId),
                Encoders.bean(SirenDigestPayload.class));

    // Generate aggregated statistics before we do any sampling
    Dataset<Row> stats =
        filteredAnalyzerResults
            .filter(col(Fields.anomalyCount).$greater(lit(0l)))
            .groupBy(
                MonitorDigestFiltered.Fields.orgId,
                MonitorDigestFiltered.Fields.datasetId,
                MonitorDigestFiltered.Fields.monitorId)
            .agg(
                functions
                    .max(col(MonitorDigestFiltered.Fields.datasetTimestamp))
                    .as(SirenDigestPayload.Fields.oldestAnomalyDatasetTimestamp),
                functions
                    .sum(col(MonitorDigestFiltered.Fields.weight))
                    .as(SirenDigestPayload.Fields.totalWeight),
                functions
                    .min(col(MonitorDigestFiltered.Fields.datasetTimestamp))
                    .as(SirenDigestPayload.Fields.earliestAnomalyDatasetTimestamp),
                functions
                    .sum(col(MonitorDigestFiltered.Fields.anomalyCount))
                    .as(SirenDigestPayload.Fields.numAnomalies),
                functions
                    .max(col(MonitorDigestFiltered.Fields.severity))
                    .as(SirenDigestPayload.Fields.severity));

    // Filter down to just anomalies and take a sample
    filteredAnalyzerResults
        .filter(col(MonitorDigestFiltered.Fields.anomalyCount).$greater(lit(0l)))
        .registerTempTable("filteredAnomalies");
    /**
     * One monitor could easily have 100k anomalies within a wide time range. This weird SQL query
     * sorts by most recent and crops it to 1k entries. That protects us from an OOM when we
     * groupBy+Collect into a single row. TODO: Revisit this when implementing flexible group by
     * https://gitlab.com/whylabs/core/monitor-schema/-/blob/main/schema/schema.yaml#L610
     */
    Dataset<Row> top100Anomalies =
        filteredAnalyzerResults
            .sqlContext()
            .sql(
                "select * from (select *, row_number() OVER (PARTITION BY orgId, datasetId, monitorId ORDER BY datasetTimestamp DESC) as rn from filteredAnomalies) tmp where rn < 100");
    val analyzerResultSample =
        top100Anomalies
            .groupBy(
                MonitorDigestFiltered.Fields.orgId,
                MonitorDigestFiltered.Fields.datasetId,
                MonitorDigestFiltered.Fields.monitorId)
            .agg(
                functions
                    .collect_list(functions.col(MonitorDigestFiltered.Fields.analyzerResult))
                    .as(SirenDigestPayload.Fields.anomalySample));

    // Union together all the different statistics
    val union =
        new DatasetUnionHelper(
                Arrays.asList(
                    segmentAnomalyStatistics.toDF(),
                    columnAnomalyStatistics.toDF(),
                    stats,
                    analyzerResultSample))
            .getUnion();

    // Collapse the unioned statistics by monitor id into a single siren payload
    digestSirenPayloadDf =
        union
            .groupBy(
                MonitorDigestFiltered.Fields.orgId,
                MonitorDigestFiltered.Fields.datasetId,
                MonitorDigestFiltered.Fields.monitorId)
            .agg(
                functions
                    .min(col(SirenDigestPayload.Fields.earliestAnomalyDatasetTimestamp))
                    .as(SirenDigestPayload.Fields.earliestAnomalyDatasetTimestamp),
                functions
                    .max(col(SirenDigestPayload.Fields.oldestAnomalyDatasetTimestamp))
                    .as(SirenDigestPayload.Fields.oldestAnomalyDatasetTimestamp),
                first(col(SirenDigestPayload.Fields.id), true).as(SirenDigestPayload.Fields.id),
                first(col(SirenDigestPayload.Fields.anomalySample), true)
                    .as(SirenDigestPayload.Fields.anomalySample),
                first(col(SirenDigestPayload.Fields.runId), true)
                    .as(SirenDigestPayload.Fields.runId),
                first(col(SirenDigestPayload.Fields.numAnomalies), true)
                    .as(SirenDigestPayload.Fields.numAnomalies),
                first(col(SirenDigestPayload.Fields.columnStatistics), true)
                    .as(SirenDigestPayload.Fields.columnStatistics),
                first(col(SirenDigestPayload.Fields.totalWeight), true)
                    .as(SirenDigestPayload.Fields.totalWeight),
                first(col(SirenDigestPayload.Fields.segmentStatistics), true)
                    .as(SirenDigestPayload.Fields.segmentStatistics),
                first(col(SirenDigestPayload.Fields.severity), true)
                    .as(SirenDigestPayload.Fields.severity))
            .withColumn(SirenDigestPayload.Fields.mode, lit(SirenDigestPayload.DIGEST))
            .as(Encoders.bean(SirenDigestPayload.class));

    // Apply aggregate level filters like maxTotalWeight
    digestSirenPayloadDf =
        digestSirenPayloadDf
            .joinWith(
                digests,
                digestSirenPayloadDf
                    .col(SirenDigestPayload.Fields.monitorId)
                    .equalTo(digests.col(MonitorDigest.Fields.monitorId))
                    .and(
                        digestSirenPayloadDf
                            .col(SirenDigestPayload.Fields.orgId)
                            .equalTo(digests.col(MonitorDigest.Fields.orgId)))
                    .and(
                        digestSirenPayloadDf
                            .col(SirenDigestPayload.Fields.datasetId)
                            .equalTo(digests.col(MonitorDigest.Fields.datasetId))))
            .flatMap(new SirenDigestPayloadFilter(), Encoders.bean(SirenDigestPayload.class))
            // Little fanout for hitting SQS
            .repartition(50)
            .checkpoint();

    // Uncomment if you wanna see some payloads
    // log.info(new SirenEventSerde().toJsonString(digestSirenPayloadDf.collectAsList().get(0)));

    if (nearRealTimeAlertSqsTopic != null) {
      // TODO: Update the SQS payload to referencing data in S3
      digestSirenPayloadDf.foreachPartition(
          new SirenSqsDigestSinkForeach(nearRealTimeAlertSqsTopic));
    }
    if (sirenV2AlertSqsTopic != null) {
      digestSirenPayloadDf.foreachPartition(new SirenSqsDigestSinkForeach(sirenV2AlertSqsTopic));
    }

    if (sirenDigestDatalake != null) {
      digestSirenPayloadDf
          .toDF()
          .coalesce(10)
          .withColumn("ts", lit(new Long(currentTimestamp.toInstant().toEpochMilli())))
          .write()
          .format(DELTA)
          .mode(SaveMode.Append)
          .save(sirenDigestDatalake);
      if (!skipManifestGeneration) {
        /**
         * Generate a symlink manifest to make this deltalake table friendly to presto/trino/athena.
         * This operation slows down unit tests and is only useful for prod, so we skip it most of
         * the time.
         *
         * <p>https://docs.delta.io/latest/presto-integration.html
         */
        DeltaTable.forPath(spark, sirenDigestDatalake).generate(SYMLINK_MANIFEST);
      }
    }
  }

  @SneakyThrows
  @Override
  public Dataset<Row> calculate() {
    if (!DeltalakeWriter.doesTableExist(monitorsConfigV3)) {
      log.warn("Monitor config v3 is not present, this job is a no-op");
      return null;
    } else {
      Dataset<ExplodedRow> inputRows = getExplodedRows();
      if (individualProfileMonitoringMode) {
        inputRows =
            inputRows.filter(
                col(ExplodedRow.Fields.aggregationDataGranularity)
                    .equalTo(lit(AggregationDataGranularity.INDIVIDUAL.name())));
      } else {
        inputRows =
            inputRows.filter(
                col(ExplodedRow.Fields.aggregationDataGranularity)
                    .equalTo(lit(AggregationDataGranularity.ROLLED_UP.name())));
      }

      return getMonitorMetrics(inputRows).toDF();
    }
  }

  public Dataset<AnalyzerResult> getMonitorMetrics(Dataset<ExplodedRow> rows) {

    spark
        .udf()
        .register(
            "analyze",
            functions.udaf(
                new AnalysisUdaf(
                    currentTimestamp, runId, overwriteEvents, embedableImageBasePath, configRepo),
                Encoders.bean(ExplodedRow.class)));

    Dataset<AnalyzerResult> monitorMetrics =
        rows.groupBy(
                functions.col(ExplodedRow.Fields.orgId),
                functions.col(ExplodedRow.Fields.datasetId),
                functions.col(ExplodedRow.Fields.columnName),
                functions.col(ExplodedRow.Fields.targetLevel),
                functions.col(ExplodedRow.Fields.segmentText),
                functions.col(ExplodedRow.Fields.aggregationDataGranularity),
                functions.col(ExplodedRow.Fields.subPartition))
            .agg(functions.expr("analyze(*)").as("r"))
            .select(functions.explode(col("r.results")))
            .select(col("col.*"))
            .as(Encoders.bean(AnalyzerResult.class));

    spark
        .udf()
        .register(
            AddYearMonthDay.UDF_NAME, functions.udf(new AddYearMonthDay(), DataTypes.StringType));

    // monitorMetrics.show();
    // log.info("Rows {} MonitorMetricCount {}", rows.count(), monitorMetrics.count());

    return monitorMetrics;
  }

  @SneakyThrows
  public Dataset<ExplodedRow> getExplodedRows() {

    /** Join the data to the monitor config and explode the profiles into 1row/feature * */
    // log.info("Rows before explode {}", df.count());
    // df.show();
    cacheMonitorConfig();

    Dataset<ExplodedRow> exploded = null;
    Dataset<ExplodedRow> ingestionMetrics = null;

    exploded = explodeV2Rows(getV2ProfilesTable().as(Encoders.bean(DatalakeRowV2.class)));

    // Feedback previous monitor results into the calculation
    if (DeltalakeWriter.doesTableExist(analyzerResultsPath) && !individualProfileMonitoringMode) {
      // migrateTags();
      Dataset<Row> feedback =
          DeltaTable.forPath(spark, analyzerResultsPath)
              .toDF()
              // TODO: Time range filter?
              .filter(col(Fields.latest).equalTo(lit(true)))
              .filter(col(Fields.orgId).isNotNull());
      if (orgIds != null) {
        log.info("Filtering event table by org {}", orgIds);
        feedback = feedback.filter(col(AnalyzerResult.Fields.orgId).isin(orgIds.toArray()));
      }
      if (datasetId != null) {
        feedback = feedback.filter(col(AnalyzerResult.Fields.datasetId).equalTo(datasetId));
      }

      // Schema migration
      feedback =
          FillMissingColumns.fillMissingColumnsWitNulls(
              feedback, AnalyzerResult.class.getDeclaredFields());

      Dataset<ExplodedRow> feedbackLoopData =
          feedback
              .as(Encoders.bean(AnalyzerResult.class))
              .flatMap(new MonitorEventToFeedbackLoop(), Encoders.bean(ExplodedRow.class));

      exploded = exploded.unionAll(feedbackLoopData);
    }

    return exploded;
  }

  public Dataset<ExplodedRow> explodeV2Rows(Dataset<DatalakeRowV2> rows) {
    return rows.mapPartitions(
        new DatalakeRowV2ToExplodedRows(configRepo, currentTimestamp),
        Encoders.bean(ExplodedRow.class));
  }
}
