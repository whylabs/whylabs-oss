package ai.whylabs.batch.jobs;

import static org.apache.spark.sql.functions.callUDF;
import static org.apache.spark.sql.functions.col;
import static org.apache.spark.sql.functions.lit;
import static org.apache.spark.sql.functions.udf;

import ai.whylabs.batch.MapFunctions.*;
import ai.whylabs.batch.jobs.base.AbstractSparkJob;
import ai.whylabs.batch.sinks.PostgresBulkIngestionTriggerSink;
import ai.whylabs.batch.udfs.*;
import ai.whylabs.batch.utils.FillMissingColumns;
import ai.whylabs.core.configV3.structure.MonitorConfigV3Row;
import ai.whylabs.core.enums.PostgresBulkIngestionMode;
import ai.whylabs.core.enums.TargetTable;
import ai.whylabs.core.structures.*;
import ai.whylabs.core.structures.DatalakeRowV1.Fields;
import ai.whylabs.core.structures.monitor.events.AnalyzerResult;
import ai.whylabs.core.utils.CamelSnakeConversion;
import ai.whylabs.core.utils.Constants;
import com.amazonaws.services.s3.AmazonS3URI;
import com.beust.jcommander.JCommander.Builder;
import com.beust.jcommander.Parameter;
import io.delta.tables.DeltaTable;
import java.net.URI;
import java.nio.file.Paths;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.util.*;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import org.apache.commons.lang.StringUtils;
import org.apache.hadoop.conf.Configuration;
import org.apache.hadoop.fs.FileSystem;
import org.apache.hadoop.fs.Path;
import org.apache.spark.sql.*;
import org.apache.spark.sql.expressions.UserDefinedFunction;
import org.apache.spark.sql.types.DataTypes;
import org.joda.time.Interval;

/**
 * Snapshot deltalakes to json format favorable for bulk load operations in postgres. This was meant
 * for the initial load. Hopefully we never need to run this again because there's some caveats. If
 * PG goes up in smoke it's advisable to restore from the S3 backups so you don't run into the
 * following caveats:
 *
 * <p>********* Caveats
 * *************************************************************************************************
 * No profile trace_id support here yet, so you'll wipe that field if re-ingesting from this flow
 * Updatable fields on analyzer result like the unhelpful flag will get wiped
 * *******************************************************************************************************************
 *
 * <p>Snapshot everything (prod)
 *
 * <p>spark-submit --deploy-mode client --class ai.whylabs.batch.jobs.SnapshotDeltalake
 * s3://whylabs-deployment-us-west-2/drew/murmuration10.jar -sparkMaster yarn -profilesDatalakeV1
 * s3://deltalake-20210520203743800800000001/v1-profile-datalake/ -profilesDatalakeV1Snapshot
 * s3://deltalake-20210520203743800800000001/druidSnapshot/profiles/v1delta_pg_08/
 * -analyzerResultsDatalake s3://deltalake-20210520203743800800000001/analyzer-results-v3/
 * -analyzerResultsSnapshot
 * s3://deltalake-20210520203743800800000001/druidSnapshot/analyzer_results_08/
 * -analyzerRunsDatalake s3://deltalake-20210520203743800800000001/analyzer-runs/
 * -analyzerRunsSnapshot s3://deltalake-20210520203743800800000001/druidSnapshot/analyzer_runs_08/
 * -postgresBulkIngestionTriggerTopic PostgresBulkIngestionTrigger-93eef1b
 */
@Slf4j
public class SnapshotDeltalake extends AbstractSparkJob {

  public static final String TIMESCALE_BULKLOAD_TEMPLATE =
      "for f in /s3/delta/%s*; do timescaledb-parallel-copy  --db-name whylogs --schema whylabs --connection \"jdbc://localhost:5432/user=dataservice&password=[PASSWORD]\"  --table %s --file $f --workers 32 --copy-options \"CSV\"; date; done\n";

  @Parameter(
      names = {"-profilesDatalakeV1"},
      description = "profile datalake v1")
  private String profilesDatalakeV1;

  @Parameter(
      names = {"-profilesDatalakeV1Snapshot"},
      description = "where in s3 do you wanna sink the snapshot")
  private String profilesDatalakeV1Snapshot;

  @Parameter(
      names = {"-orgId"},
      description = "Scope to single orgId")
  private String orgId;

  @Parameter(
      names = {"-analyzerResultsDatalake"},
      description = "Analyzer results datalake")
  private String analyzerResultsDatalake;

  @Parameter(
      names = {"-analyzerResultsSnapshot"},
      description = "where in s3 do you wanna sink the snapshot")
  private String analyzerResultsSnapshot;

  @Parameter(
      names = {"-analyzerRunsDatalake"},
      description = "Analyzer results datalake")
  private String analyzerRunsDatalake;

  @Parameter(
      names = {"-analyzerRunsSnapshot"},
      description = "where in s3 do you wanna sink the snapshot")
  private String analyzerRunsSnapshot;

  @Parameter(
      names = {"-monitorConfigDatalake"},
      description = "Monitor config datalake")
  private String monitorConfigDatalake;

  @Parameter(
      names = {"-monitorConfigSnapshot"},
      description = "where in s3 do you wanna sink the snapshot")
  private String monitorConfigSnapshot;

  @Parameter(
      names = "-profileInterval",
      description =
          "Scope the snapshot & deletion code to a profile's dataset time range to surgically replace a window of time. EG 2020-12-01T00:00:00Z/2023-12-10T00:00:00Z")
  protected String profileInterval;

  @Parameter(
      names = {"-postgresBulkIngestionTriggerTopic"},
      description = "Kinesis topic to notify its time for a bulk insert")
  private String postgresBulkIngestionTriggerTopic;

  private static final int PARTITIONS = 50;

  @SneakyThrows
  public Dataset<Row> calculate() {
    String runId = UUID.randomUUID().toString();
    long now = ZonedDateTime.now().toInstant().toEpochMilli();
    log.info("RunId {}", runId);

    PostgresBulkIngestionTriggerSink postgresBulkIngestionTrigger =
        new PostgresBulkIngestionTriggerSink(postgresBulkIngestionTriggerTopic);

    if (monitorConfigDatalake != null && monitorConfigSnapshot != null) {
      Dataset<Row> df =
          DeltaTable.forPath(spark, monitorConfigDatalake)
              .toDF()
              .drop(MonitorConfigV3Row.Fields.bin);
      val fieldNames = df.schema().fieldNames();
      for (int x = 0; x < fieldNames.length; x++) {
        df = df.withColumnRenamed(fieldNames[x], CamelSnakeConversion.toSnake(fieldNames[x]));
      }
      df =
          df.repartition(
                  PARTITIONS,
                  col(AnalyzerRun.Fields.orgId.name()),
                  col(AnalyzerRun.Fields.datasetId.name()))
              .sortWithinPartitions(
                  AnalyzerRun.Fields.orgId.name(), AnalyzerRun.Fields.datasetId.name());
      df.write().format("parquet").save(monitorConfigSnapshot);
      postgresBulkIngestionTrigger.send(
          Arrays.asList(
              PostgresBulkIngestionTrigger.builder()
                  .path(monitorConfigSnapshot)
                  .requestedTs(System.currentTimeMillis())
                  .runId(runId)
                  .async(true)
                  .targetTable(TargetTable.MONITOR_CONFIG)
                  .jobRunCurrentTime(now)
                  .mode(PostgresBulkIngestionMode.replace)
                  .build()));
    }
    if (analyzerRunsDatalake != null && analyzerRunsSnapshot != null) {
      Dataset<Row> df =
          transformAnalyzerRunsToPostgresFriendlyBulkloadFormat(
                  spark, DeltaTable.forPath(spark, analyzerRunsDatalake).toDF())
              .repartition(
                  PARTITIONS,
                  col(AnalyzerRun.Fields.orgId.name()),
                  col(AnalyzerRun.Fields.datasetId.name()))
              .sortWithinPartitions(
                  AnalyzerRun.Fields.orgId.name(), AnalyzerRun.Fields.datasetId.name());

      df.write().format("parquet").save(analyzerRunsSnapshot);

      postgresBulkIngestionTrigger.send(
          Arrays.asList(
              PostgresBulkIngestionTrigger.builder()
                  .path(analyzerRunsSnapshot)
                  .requestedTs(System.currentTimeMillis())
                  .runId(runId)
                  .async(true)
                  .targetTable(TargetTable.ANALYZER_RUNS)
                  .jobRunCurrentTime(now)
                  .mode(PostgresBulkIngestionMode.replace)
                  .build()));
    }

    if (profilesDatalakeV1 != null && profilesDatalakeV1Snapshot != null) {
      if (!profilesDatalakeV1Snapshot.endsWith("/")) {
        profilesDatalakeV1Snapshot = profilesDatalakeV1Snapshot + "/";
      }
      Dataset<Row> df =
          FillMissingColumns.fillMissingColumnsWitNulls(
                  DeltaTable.forPath(spark, profilesDatalakeV1).toDF(),
                  DatalakeRowV1.class.getDeclaredFields())
              .filter(col(Fields.orgId).isNotNull())
              .filter(col(Fields.datasetId).isNotNull())
              .filter(col(Fields.datasetTimestamp).$greater(lit(0)));
      if (!StringUtils.isEmpty(orgId)) {
        df = df.filter(col(Fields.orgId).equalTo(lit(orgId)));
      }

      Interval scopeInterval = null;
      if (!StringUtils.isEmpty(profileInterval)) {
        scopeInterval = Interval.parse(profileInterval);
      }

      if (scopeInterval != null) {
        df =
            df.filter(
                col(Fields.datasetTimestamp).$greater$eq(lit(scopeInterval.getStartMillis())));
        df = df.filter(col(Fields.datasetTimestamp).$less(lit(scopeInterval.getEndMillis())));
      }

      df =
          FillMissingColumns.fillMissingColumnsWitNulls(
              df, DatalakeRowV1.class.getDeclaredFields());

      long cutoverTimestamp =
          df.select(functions.max(col(Fields.lastUploadTs))).collectAsList().get(0).getLong(0);

      val cutover = ZonedDateTime.ofInstant(Instant.ofEpochMilli(cutoverTimestamp), ZoneOffset.UTC);
      val auditTablePath = profilesDatalakeV1Snapshot + "audit_table/";
      val refProfilePath = profilesDatalakeV1Snapshot + "ref_profiles/";
      val segmentedPath = profilesDatalakeV1Snapshot + "segmented/";
      val overallPath = profilesDatalakeV1Snapshot + "overall/";
      val tagsPath = profilesDatalakeV1Snapshot + "tags/";
      val legacySegmentsPath = profilesDatalakeV1Snapshot + "legacy_segments/";

      // Audit table
      df.filter(col(Fields.originalFilename).isNotNull())
          .dropDuplicates(Fields.originalFilename)
          .as(Encoders.bean(DatalakeRowV1.class))
          .map(new DatalakeRowV1ToCsv(), Encoders.STRING())
          .write()
          .text(auditTablePath);

      // Ref profiles
      df.filter(col(Fields.referenceProfileId).isNotNull())
          .filter(col(Fields.originalFilename).isNull())
          .as(Encoders.bean(DatalakeRowV1.class))
          .map(new DatalakeRowV1ToCsv(), Encoders.STRING())
          .write()
          .text(refProfilePath);

      // Segmented
      df.filter(col(Fields.referenceProfileId).isNull())
          .filter(col(Fields.originalFilename).isNull())
          .filter(col(Fields.segmentText).isNotNull())
          .repartition(
              PARTITIONS,
              col(Fields.orgId),
              col(Fields.datasetId),
              col(Fields.columnName),
              col(Fields.segmentText))
          .sortWithinPartitions(
              Fields.orgId,
              Fields.datasetId,
              Fields.columnName,
              Fields.datasetTimestamp,
              Fields.segmentText)
          .as(Encoders.bean(DatalakeRowV1.class))
          .map(new DatalakeRowV1ToCsv(), Encoders.STRING())
          .write()
          .text(segmentedPath);

      // Overall
      WhylogDeltalakeWriterJob.mergeV1Rows(
              df.filter(col(Fields.referenceProfileId).isNull())
                  .filter(col(Fields.originalFilename).isNull())
                  .drop(Fields.segmentText)
                  // Segments collapsed to create an overall row, we have null out the segmentText
                  // field to
                  // cast it to a DatalakeRowV1
                  .withColumn(Fields.segmentText, lit(null))
                  .as(Encoders.bean(DatalakeRowV1.class)),
              spark)
          .repartition(PARTITIONS, col(Fields.orgId), col(Fields.datasetId), col(Fields.columnName))
          .sortWithinPartitions(
              Fields.orgId, Fields.datasetId, Fields.columnName, Fields.datasetTimestamp)
          .as(Encoders.bean(DatalakeRowV1.class))
          .map(new DatalakeRowV1ToCsv(), Encoders.STRING())
          .write()
          .text(overallPath);

      UserDefinedFunction segmentTagToKey = udf(new SegmentTagToKey(), DataTypes.StringType);
      UserDefinedFunction segmentTagToValue = udf(new SegmentTagToValue(), DataTypes.StringType);
      UserDefinedFunction unixToPgTimestamp = udf(new UnixToPGTimestamp(), DataTypes.StringType);

      // Legacy segment table
      df.as(Encoders.bean(DatalakeRowV1.class))
          .toDF()
          .filter(col(Fields.segmentText).isNotNull())
          .filter(col(Fields.referenceProfileId).isNull())
          .groupBy(
              col(Fields.orgId).as(LegacySegmentTableEntry.Fields.org_id),
              col(Fields.datasetId).as(LegacySegmentTableEntry.Fields.dataset_id),
              col(Fields.segmentText).as(LegacySegmentTableEntry.Fields.segment_text))
          .agg(
              functions
                  .max(col(Fields.datasetTimestamp))
                  .as(LegacySegmentTableEntry.Fields.latest_dataset_timestamp),
              functions
                  .min(col(Fields.datasetTimestamp))
                  .as(LegacySegmentTableEntry.Fields.oldest_dataset_timestamp),
              functions
                  .max(col(Fields.lastUploadTs))
                  .as(LegacySegmentTableEntry.Fields.latest_upload_timestamp),
              functions
                  .min(col(Fields.lastUploadTs))
                  .as(LegacySegmentTableEntry.Fields.oldest_upload_timestamp))
          .as(Encoders.bean(LegacySegmentTableEntry.class))
          .coalesce(PARTITIONS)
          .map(new LegacySegmentEntryToCsv(), Encoders.STRING())
          .write()
          .text(legacySegmentsPath);

      // Tags table (segmented)
      val segmentedTags =
          df.as(Encoders.bean(DatalakeRowV1.class))
              .flatMap(new DatalakeRowV1TagFanout(), Encoders.bean(DatalakeRowV1.class))
              .toDF()
              .filter(col(Fields.segmentText).isNotNull())
              .groupBy(col(Fields.orgId), col(Fields.datasetId), col(Fields.segmentText))
              .agg(
                  functions
                      .max(col(Fields.datasetTimestamp))
                      .as(TagTableRow.Fields.latest_dataset_timestamp),
                  functions
                      .min(col(Fields.datasetTimestamp))
                      .as(TagTableRow.Fields.oldest_dataset_timestamp),
                  functions
                      .max(col(Fields.lastUploadTs))
                      .as(TagTableRow.Fields.latest_upload_timestamp),
                  functions
                      .min(col(Fields.lastUploadTs))
                      .as(TagTableRow.Fields.oldest_upload_timestamp))
              .withColumn(
                  TagTableRow.Fields.tag_key, segmentTagToKey.apply(col(Fields.segmentText)))
              .withColumn(
                  TagTableRow.Fields.tag_value, segmentTagToValue.apply(col(Fields.segmentText)))
              .withColumnRenamed(Fields.orgId, TagTableRow.Fields.org_id)
              .withColumnRenamed(Fields.datasetId, TagTableRow.Fields.dataset_id)
              .drop(Fields.segmentText)
              .as(Encoders.bean(TagTableRow.class));

      // Tags table (overall)
      val overallTags =
          df.groupBy(col(Fields.orgId), col(Fields.datasetId))
              .agg(
                  functions
                      .max(col(Fields.datasetTimestamp))
                      .as(TagTableRow.Fields.latest_dataset_timestamp),
                  functions
                      .min(col(Fields.datasetTimestamp))
                      .as(TagTableRow.Fields.oldest_dataset_timestamp),
                  functions
                      .max(col(Fields.lastUploadTs))
                      .as(TagTableRow.Fields.latest_upload_timestamp),
                  functions
                      .min(col(Fields.lastUploadTs))
                      .as(TagTableRow.Fields.oldest_upload_timestamp))
              .withColumn(TagTableRow.Fields.tag_key, lit(""))
              .withColumn(TagTableRow.Fields.tag_value, lit(""))
              .withColumnRenamed(Fields.orgId, TagTableRow.Fields.org_id)
              .withColumnRenamed(Fields.datasetId, TagTableRow.Fields.dataset_id)
              .as(Encoders.bean(TagTableRow.class));
      segmentedTags
          .unionAll(overallTags)
          .coalesce(PARTITIONS)
          .map(new TagsTableCsv(), Encoders.STRING())
          .write()
          .text(tagsPath);

      String extraWhereClause = "";
      if (scopeInterval != null) {
        extraWhereClause =
            " and dataset_timestamp >= '"
                + ZonedDateTime.ofInstant(
                    Instant.ofEpochMilli(scopeInterval.getStartMillis()), ZoneOffset.UTC)
                + "'::timestamp and dataset_timestamp < '"
                + ZonedDateTime.ofInstant(
                    Instant.ofEpochMilli(scopeInterval.getEndMillis()), ZoneOffset.UTC)
                + "'::timestamp ";
      }
      if (!StringUtils.isEmpty(orgId)) {
        extraWhereClause = extraWhereClause + " and org_id = '" + orgId + "' ";
      }

      System.out.println(
          "======= IF this is the first load you'll need to delete entries prior to a cutover point so we can backfill while in flight. After backfilling there's too much data for these deletes to execute in a reasonable timeframe (consider other options like dropping chunks during a downtime rebuild window).");
      System.out.println(
          "psql -a whylogs -c \"delete from whylabs.profiles_segmented_hypertable where last_upload_ts <= '"
              + cutover
              + "'::timestamp "
              + extraWhereClause
              + "\"");
      System.out.println(
          "psql -a whylogs -c \"delete from whylabs.profiles_segmented_staging where last_upload_ts <= '"
              + cutover
              + "'::timestamp "
              + extraWhereClause
              + "\"");
      System.out.println(
          "psql -a whylogs -c \"delete from whylabs.profile_upload_audit where ingest_timestamp is null or ingest_timestamp <= '"
              + cutover
              + "'::timestamp "
              + extraWhereClause
              + "\"");
      if (scopeInterval == null) {
        // Don't mess with ref profiles when rebuilding a time range
        System.out.println(
            "psql -a whylogs -c \"delete from whylabs.reference_profiles where last_upload_ts is null or last_upload_ts <= '"
                + cutover
                + "'::timestamp \"");
      }

      log.info(
          "======= Rebuild timeseries table commands to run via k9s on the CLI as the postgres user. Run as many times as needed, the backfillTimeseries function is idempotent.");
      System.out.println(
          "psql -a whylogs -c \"select f.* from  generate_series('2023-01-01'::date,'2024-01-01'::date,'1 day') s(a), backfillTimeseries(a::date) f;\"");
      System.out.println(
          "psql -a whylogs -c \"select f.* from  generate_series('2022-01-01'::date,'2023-01-01'::date,'1 day') s(a), backfillTimeseries(a::date) f;\"");
      System.out.println(
          "psql -a whylogs -c \"select f.* from  generate_series('2021-01-01'::date,'2022-01-01'::date,'1 day') s(a), backfillTimeseries(a::date) f;\"");
      System.out.println(
          "psql -a whylogs -c \"select f.* from  generate_series('2020-01-01'::date,'2021-01-01'::date,'1 day') s(a), backfillTimeseries(a::date) f;\"");
      System.out.println(
          "psql -a whylogs -c \"select f.* from  generate_series('2019-01-01'::date,'2020-01-01'::date,'1 day') s(a), backfillTimeseries(a::date) f;\"");

      System.out.println(
          "psql -a whylogs -c \"delete from whylabs.profiles_overall_hypertable where last_upload_ts <= '"
              + cutover
              + "'::timestamp "
              + extraWhereClause
              + "\"");
      System.out.println(
          "psql -a whylogs -c \"delete from whylabs.profiles_overall_staging where last_upload_ts <= '"
              + cutover
              + "'::timestamp "
              + extraWhereClause
              + "\"");

      log.info("======= Bulk load commands to run via k9s on the CLI as the postgres user ");
      log.info("Note you must swap out [PASSWORD]");
      log.info("Note: num_workers should align with #cpu cores on the cluster you're loading into");
      if (tagsPath.startsWith("s3")) {
        System.out.println(
            String.format(
                TIMESCALE_BULKLOAD_TEMPLATE,
                new AmazonS3URI(tagsPath).getKey(),
                "bulk_proxy_tags_hypertable"));
        System.out.println(
            String.format(
                TIMESCALE_BULKLOAD_TEMPLATE,
                new AmazonS3URI(legacySegmentsPath).getKey(),
                "bulk_proxy_legacy_segments_hypertable"));
        System.out.println(
            String.format(
                TIMESCALE_BULKLOAD_TEMPLATE,
                new AmazonS3URI(segmentedPath).getKey(),
                "bulk_proxy_profiles_segmented_hypertable"));
        System.out.println(
            String.format(
                TIMESCALE_BULKLOAD_TEMPLATE,
                new AmazonS3URI(auditTablePath).getKey(),
                "bulk_proxy_audit_hypertable"));
        if (scopeInterval == null) {
          // Don't mess with ref profiles when rebuilding a time range
          System.out.println(
              String.format(
                  TIMESCALE_BULKLOAD_TEMPLATE,
                  new AmazonS3URI(refProfilePath).getKey(),
                  "bulk_proxy_reference_profiles_hypertable"));
        }
        System.out.println(
            String.format(
                TIMESCALE_BULKLOAD_TEMPLATE,
                new AmazonS3URI(overallPath).getKey(),
                "bulk_proxy_profiles_overall_hypertable"));
      }

      log.info(
          "======= Important: you've gotta vacuum tables to populate the tuple visibility map or index only scans have to do heap checks and the perf will tank on certain queries");
      System.out.println(
          "psql -a whylogs -c \"vacuum analyze whylabs.profiles_overall_hypertable;\"");
      System.out.println(
          "psql -a whylogs -c \"vacuum analyze whylabs.profiles_staging_hypertable;\"");
    }

    if (analyzerResultsDatalake != null && analyzerResultsSnapshot != null) {
      Dataset<Row> df =
          DeltaTable.forPath(spark, analyzerResultsDatalake)
              .toDF()
              .filter(col(AnalyzerResult.Fields.latest).equalTo(lit(true)))
              .repartition(
                  PARTITIONS * 10,
                  col(AnalyzerResult.Fields.orgId),
                  col(AnalyzerResult.Fields.datasetId),
                  col(AnalyzerResult.Fields.column),
                  col(AnalyzerResult.Fields.segment))
              .sortWithinPartitions(
                  AnalyzerResult.Fields.orgId,
                  AnalyzerResult.Fields.datasetId,
                  AnalyzerResult.Fields.column,
                  AnalyzerResult.Fields.datasetTimestamp,
                  AnalyzerResult.Fields.segment);

      FillMissingColumns.fillMissingColumnsWitNulls(df, AnalyzerResult.class.getDeclaredFields())
          .as(Encoders.bean(AnalyzerResult.class))
          .mapPartitions(new AnalyzerResultToJson(), Encoders.STRING())
          .write()
          .text(analyzerResultsSnapshot);

      if (analyzerResultsSnapshot.startsWith("s3")) {
        val s3Uri = new AmazonS3URI(analyzerResultsSnapshot);

        // TODO: This is scalable, very hacky/clunky. Hopefully we're not running this often enough
        // to justify cleaning it up, but if we do then consider switching to timescaledb proxy
        // tables.
        FileSystem fs = FileSystem.get(new URI(analyzerResultsSnapshot), new Configuration());
        val list = fs.listFiles(new Path(analyzerResultsSnapshot), true);
        System.out.println(
            "Copy command uses transactions with a function that generates row locks which can time out ingestion from an hourly pipeline run if they live too long. Thus we chunk ingestion into a bunch of pretty small files so the transactions are short lived.");
        System.out.println(
            "Run these in groups of 20-30 at a time (based on how many cpu cores are avail)");
        while (list.hasNext()) {
          val file = list.next();
          val pieces = StringUtils.split(file.getPath().toString(), "/");
          String filename = pieces[pieces.length - 1];
          if (!filename.endsWith(".txt")) {
            continue;
          }
          val postgresReadPath = Paths.get("/s3/delta/" + s3Uri.getKey()) + "/" + filename;
          String sql =
              "COPY whylabs.bulk_proxy_analysis (json_blob) FROM '" + postgresReadPath + "'";
          System.out.println("psql -a whylogs -c \"" + sql + ";\"&");
        }

        System.out.println("psql -a whylogs -c \"vacuum analyze whylabs.analysis_non_anomalies;\"");
        System.out.println("psql -a whylogs -c \"vacuum analyze whylabs.analysis_anomalies;\"");
      }

      postgresBulkIngestionTrigger.send(
          Arrays.asList(
              PostgresBulkIngestionTrigger.builder()
                  .path(analyzerResultsSnapshot)
                  .requestedTs(System.currentTimeMillis())
                  .runId(runId)
                  .async(true)
                  .jobRunCurrentTime(now)
                  .targetTable(TargetTable.ANALYZER_RESULTS)
                  .mode(PostgresBulkIngestionMode.replace)
                  .build()));
    }

    return null;
  }

  public static Dataset<Row> transformAnalyzerRunsToPostgresFriendlyBulkloadFormat(
      SparkSession spark, Dataset<Row> df) {
    // ID was recently added, gotta backfill it for the snapshot
    spark.udf().register(DeriveUUID.COL, functions.udf(new DeriveUUID(), DataTypes.StringType));

    df =
        df.drop(col(AnalyzerRun.Fields.id.name()))
            .withColumn(
                AnalyzerRun.Fields.id.name(),
                callUDF(
                    DeriveUUID.COL,
                    col(AnalyzerRun.Fields.orgId.name()),
                    col(AnalyzerRun.Fields.datasetId.name()),
                    col(AnalyzerRun.Fields.runId.name()),
                    col(AnalyzerRun.Fields.analyzerId.name())));

    val fieldNames = df.schema().fieldNames();
    for (int x = 0; x < fieldNames.length; x++) {
      df = df.withColumnRenamed(fieldNames[x], CamelSnakeConversion.toSnake(fieldNames[x]));
    }
    df = unixToDate(df, CamelSnakeConversion.toSnake(AnalyzerRun.Fields.completedTs.name()));
    df = unixToDate(df, CamelSnakeConversion.toSnake(AnalyzerRun.Fields.createdTs.name()));
    df = unixToDate(df, CamelSnakeConversion.toSnake(AnalyzerRun.Fields.startedTs.name()));
    return df;
  }

  public static Dataset<Row> transformAnalyzerResultsToPostgresFriendlyBulkloadFormat(
      Dataset<Row> df) {
    // Null out empty arrays to make things consistant
    String old = AnalyzerResult.Fields.frequentStringComparison_sample + "old";
    df = df.withColumnRenamed(AnalyzerResult.Fields.frequentStringComparison_sample, old);

    df =
        df.withColumn(
            AnalyzerResult.Fields.frequentStringComparison_sample,
            functions
                .when(functions.size(col(old)).equalTo(lit(0)), lit(null))
                .otherwise(col(old)));
    df = df.drop(old);

    val fieldNames = df.schema().fieldNames();
    for (int x = 0; x < fieldNames.length; x++) {
      df = df.withColumnRenamed(fieldNames[x], CamelSnakeConversion.toSnake(fieldNames[x]));
    }
    // column is a reserved word in postgres so we name it differently there
    df = df.withColumnRenamed(AnalyzerResult.Fields.column, Constants.COLUMN_NAME);
    df = unixToDate(df, CamelSnakeConversion.toSnake(AnalyzerResult.Fields.datasetTimestamp));
    df = unixToDate(df, CamelSnakeConversion.toSnake(AnalyzerResult.Fields.creationTimestamp));

    /*
    df =
        df.withColumn(
            AnalyzerResult.Fields.columnList_addedSample,
            functions
                .when(functions.size(col("arr")).equalTo(0), lit(null))
                .otherwise(col(AnalyzerResult.Fields.columnList_addedSample)));
    df =
        df.withColumn(
            AnalyzerResult.Fields.columnList_removedSample,
            functions
                .when(functions.size(col("arr")).equalTo(0), lit(null))
                .otherwise(col(AnalyzerResult.Fields.columnList_removedSample)));*/
    return df;
  }

  private static Dataset<Row> renameColumnIgnoreCase(
      Dataset<Row> df, String oldName, String newName) {
    val fieldNames = df.schema().fieldNames();
    for (int x = 0; x < fieldNames.length; x++) {
      if (fieldNames[x].equalsIgnoreCase(oldName)) {
        df = df.withColumnRenamed(fieldNames[x], newName);
        break;
      }
    }
    return df;
  }

  public static Dataset<Row> castByteArray(Dataset<Row> df, String col) {
    String temp = col + "_temp";
    df = df.withColumnRenamed(col, temp);

    UserDefinedFunction encoder = udf(new BinaryEncoder(), DataTypes.BinaryType);
    df = df.withColumn(col, encoder.apply(col(temp)));
    df = df.drop(temp);
    return df;
  }

  private static Dataset<Row> unixToDate(Dataset<Row> df, String column) {
    String unixColumn = column + "_unix";

    return df.withColumnRenamed(column, unixColumn)
        .withColumn(
            column,
            functions
                .date_format(
                    col(unixColumn).$div(1000).cast(DataTypes.TimestampType),
                    "yyyy-MM-dd'T'HH:mm:ss+00")
                .cast(DataTypes.StringType))
        .drop(col(unixColumn));
  }

  @Override
  protected Builder parserBuilder() {
    // do not accept unknown options
    return super.parserBuilder().acceptUnknownOptions(false);
  }

  public static void main(String[] args) {
    new SnapshotDeltalake().run(args);
  }
}
