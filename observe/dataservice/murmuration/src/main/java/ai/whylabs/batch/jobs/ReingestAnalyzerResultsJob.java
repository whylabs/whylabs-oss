package ai.whylabs.batch.jobs;

import static org.apache.spark.sql.functions.*;

import ai.whylabs.batch.MapFunctions.AnalyzerResultToJson;
import ai.whylabs.batch.jobs.base.AbstractSparkJob;
import ai.whylabs.batch.sinks.PostgresBulkIngestionTriggerSink;
import ai.whylabs.batch.udfs.AddYearMonthDay;
import ai.whylabs.batch.utils.FillMissingColumns;
import ai.whylabs.core.enums.PostgresBulkIngestionMode;
import ai.whylabs.core.enums.TargetTable;
import ai.whylabs.core.structures.PostgresBulkIngestionTrigger;
import ai.whylabs.core.structures.monitor.events.AnalyzerResult;
import ai.whylabs.druid.whylogs.streaming.S3ContentFetcher;
import com.amazonaws.services.s3.AmazonS3URI;
import com.beust.jcommander.Parameter;
import io.delta.tables.DeltaTable;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import org.apache.spark.sql.Dataset;
import org.apache.spark.sql.Encoders;
import org.apache.spark.sql.Row;
import org.apache.spark.sql.functions;
import org.apache.spark.sql.types.DataTypes;

/**
 * If you ever need to reingest analyzer results from deltalake, run this job in prod, check stderr,
 * and it logs out the commands to run on the psql command line to initiate ingestion. EG
 *
 * <p>spark-submit --deploy-mode client --class ai.whylabs.batch.jobs.ReingestAnalyzerResultsJob
 * s3://whylabs-deployment-us-west-2/drew/murmuration90.jar -sparkMaster yarn -monitorsConfigV3
 * s3://deltalake-20210520203743800800000001/config-v3/ -analyzerRuns
 * s3://deltalake-20210520203743800800000001/analyzer-runs/ -nearRealTimeAlertSqsTopic
 * nearRealTimeAlert-479b061 -nearRealTimeAlertStagingArea
 * s3://deltalake-20210520203743800800000001/near-realtime-alerts-v3/ -analyzerResultsPath
 * s3://deltalake-20210520203743800800000001/analyzer-results-v3/ -embedableImageBasePath
 * s3://deltalake-20210520203743800800000001/images/analysis/ -profilesDatalakeV2
 * s3://deltalake-20210520203743800800000001/v2-profile-datalake/ -configRepo
 * s3://deltalake-20210520203743800800000001/config-snapshot/config.json -s3SnapshotStagingArea
 * s3://deltalake-20210520203743800800000001/near-realtime-alerts-v3/ -orgId org-fDqdaK -datasetId
 * model-19 -cutoff 0
 */
@Slf4j
public class ReingestAnalyzerResultsJob extends AbstractSparkJob {

  @Parameter(
      names = "-s3SnapshotStagingArea",
      description =
          "A temp location (typically S3) for files to be ingested for druid (events). Note, our infra code puts an S3 lifecycle on these snapshots so they don't stick around forever.",
      required = false)
  protected String s3SnapshotStagingArea;

  @Parameter(
      names = "-analyzerResultsPath",
      description =
          "If set, we will output the events data in the structure we send to druid to the specified path",
      required = true)
  protected String analyzerResultsPath;

  @Parameter(
      names = {"-postgresBulkIngestionTriggerTopic"},
      description = "Kinesis topic to notify its time for a bulk insert")
  private String postgresBulkIngestionTriggerTopic;

  @Parameter(names = "-orgId", description = "Target org ID to filter the data by")
  protected String orgId;

  @Parameter(names = "-datasetId", description = "Target dataset ID to filter the data by")
  protected String datasetId;

  @Parameter(names = "-cutoff", description = "Unix timestamp in millis of how far back to go")
  protected Long cutoff = 1720051161000l;

  public static void main(String[] args) {
    new ReingestAnalyzerResultsJob().run(args);
  }

  @Override
  public Dataset<Row> calculate() {
    if (!s3SnapshotStagingArea.endsWith("/")) {
      s3SnapshotStagingArea = s3SnapshotStagingArea + "/";
    }
    spark
        .udf()
        .register(
            AddYearMonthDay.UDF_NAME, functions.udf(new AddYearMonthDay(), DataTypes.StringType));
    val pgSnapshotLocation =
        s3SnapshotStagingArea + "analyzer_results_pg_snapshot/" + UUID.randomUUID() + "/";
    Dataset<Row> df =
        DeltaTable.forPath(spark, analyzerResultsPath)
            .toDF()
            .filter(col(AnalyzerResult.Fields.latest).equalTo(lit(true)));
    if (orgId != null) {
      df = df.filter(col(AnalyzerResult.Fields.orgId).equalTo(lit(orgId)));
    }
    if (datasetId != null) {
      df = df.filter(col(AnalyzerResult.Fields.datasetId).equalTo(datasetId));
    }

    log.info("Snapshotting analysis for postgres to {}", pgSnapshotLocation);
    FillMissingColumns.fillMissingColumnsWitNulls(df, AnalyzerResult.class.getDeclaredFields())
        .filter(col(AnalyzerResult.Fields.creationTimestamp).$greater$eq(cutoff))
        .drop(col(AnalyzerResult.Fields.yyyymmdd))
        .withColumn(
            AnalyzerResult.Fields.yyyymmdd,
            callUDF(AddYearMonthDay.UDF_NAME, col(AnalyzerResult.Fields.datasetTimestamp)))
        .repartition(100, col(AnalyzerResult.Fields.yyyymmdd), col(AnalyzerResult.Fields.datasetId))
        .sortWithinPartitions(
            col(AnalyzerResult.Fields.orgId),
            col(AnalyzerResult.Fields.datasetId),
            col(AnalyzerResult.Fields.segment),
            col(AnalyzerResult.Fields.column))
        .as(Encoders.bean(AnalyzerResult.class))
        .mapPartitions(new AnalyzerResultToJson(), Encoders.STRING())
        .write()
        .text(pgSnapshotLocation);

    if (postgresBulkIngestionTriggerTopic != null) {
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

    val s3Uri = new AmazonS3URI(pgSnapshotLocation);
    val res = new S3ContentFetcher().getS3Client().listObjectsV2(s3Uri.getBucket(), s3Uri.getKey());
    List<String> keys = new ArrayList<>();
    for (val r : res.getObjectSummaries()) {
      if (r.getKey().endsWith(".txt")) {
        System.err.println(
            "COPY whylabs.bulk_proxy_analysis (json_blob) FROM PROGRAM 'cat /s3/delta/"
                + r.getKey()
                + "';");
        System.err.println("select now();");
      }
    }

    return null;
  }
}
