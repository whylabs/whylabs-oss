package ai.whylabs.batch.jobs;

import static org.apache.spark.sql.functions.callUDF;
import static org.apache.spark.sql.functions.col;
import static org.apache.spark.sql.functions.lit;
import static org.apache.spark.sql.functions.udf;
import static org.apache.spark.sql.types.DataTypes.DoubleType;

import ai.whylabs.batch.MapFunctions.*;
import ai.whylabs.batch.aggregators.*;
import ai.whylabs.batch.jobs.base.AbstractSparkJob;
import ai.whylabs.batch.jobs.base.AbstractTransformationJob;
import ai.whylabs.batch.udfs.AddYearMonthDay;
import ai.whylabs.batch.udfs.ExtractOrgIdFromPath;
import ai.whylabs.batch.udfs.VarianceExtract;
import ai.whylabs.batch.udfs.VarianceToBytes;
import ai.whylabs.batch.utils.DatasetUnionHelper;
import ai.whylabs.batch.utils.DeltalakeMergeCondition;
import ai.whylabs.batch.utils.DeltalakeWriter;
import ai.whylabs.core.configV3.structure.MonitorConfigV3Row;
import ai.whylabs.core.enums.ProfileColumnType;
import ai.whylabs.core.structures.*;
import ai.whylabs.core.structures.DatalakeRow.Fields;
import ai.whylabs.core.structures.monitor.events.AnalyzerResult;
import ai.whylabs.druid.whylogs.column.WhyLogsRow;
import com.beust.jcommander.Parameter;
import com.google.common.base.Preconditions;
import com.google.common.collect.ImmutableList;
import io.delta.tables.DeltaTable;
import java.net.URI;
import java.nio.file.Paths;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.*;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import org.apache.commons.io.FilenameUtils;
import org.apache.commons.lang3.StringUtils;
import org.apache.hadoop.conf.Configuration;
import org.apache.hadoop.fs.FileSystem;
import org.apache.hadoop.fs.Path;
import org.apache.spark.sql.*;
import org.apache.spark.sql.api.java.UDF1;
import org.apache.spark.sql.api.java.UDF2;
import org.apache.spark.sql.expressions.UserDefinedFunction;
import org.apache.spark.sql.types.DataTypes;
import scala.collection.JavaConverters;

/**
 * Read whylabs profile files from S3 and convert them into a densely packed parquet files as
 * defined by the schema in TableStructure.java, managed by the deltalake framework.
 */
@Slf4j
public class WhylogDeltalakeWriterJob extends AbstractSparkJob {
  @Parameter(
      names = "-source",
      description = "Input file glob for bin files we want to write to the deltalake",
      required = false)
  private String source;

  @Parameter(
      names = "-asyncSource",
      description =
          "Input file glob for bin files we want to write to the deltalake in logAsync format",
      required = false)
  private String asyncSource;

  @Parameter(
      names = "-singleRefProfileSource",
      description =
          "Input file glob for bin files we want to write to the deltalake in logAsync format",
      required = false)
  private String singleRefProfileSource;

  @Parameter(
      names = "-destination",
      description = "Output location of the deltalake",
      required = false)
  private String profiles;

  @Deprecated
  @Parameter(
      names = "-profilesDatalakeV1",
      description = "Output location of the v1 profiles datalake")
  private String profilesDatalakeV1;

  @Parameter(
      names = "-profilesDatalakeV2",
      description =
          "Output location of the v2 profiles datalake. Similar to what's in PG, but collapsed down to multiple metrics per column")
  public String profilesDatalakeV2;

  @Parameter(
      names = "-globPattern",
      description = "We can use this to filter out by org ID, for example")
  private String globPattern = "{*.bin}";

  @Parameter(
      names = "-noDate",
      description =
          "By default, use currentDatetime to build the file path."
              + " Otherwise, set this flag to not append date time to the path")
  private boolean noDate = false;

  @Parameter(
      names = "-stagingArea",
      description =
          "A location to write the bin files to (typically S3). Note, our infra code puts an S3 lifecycle on these snapshots so they don't stick around forever.",
      required = false)
  private String stagingArea;

  @Parameter(
      names = "-externalS3StagingBucket",
      description =
          "Staging bucket. Required if we are using Parquet. We need to copy"
              + "data over to this bucket before we can use Spark parquet to read it. Why? Because"
              + "our Spark is set up under our account, which doesn't have direct access to customer's bucket"
              + "Doing per bucket authentication is possible but we don't have resources atm",
      required = false)
  private String externalS3StagingBucket;

  @Parameter(
      names = "-monitorConfigChanges",
      description =
          "monitorConfig json files dashbird has dumped to S3 awaiting to enter the deltalake",
      required = false)
  private String monitorConfigV3Changes;

  @Parameter(
      names = {"-monitorConfigV3", "monitorsConfigV3"},
      description = "monitorConfigV3 deltalake",
      required = false)
  private String monitorConfigV3;

  @Parameter(
      names = "-skipManifestGeneration",
      description =
          "Datalakes can generate a symlink manifest which you use when querying from Athena, but it adds some time to the job so we wanna skip during unit tests")
  private Boolean skipManifestGeneration = false;

  @Parameter(
      names = "-analyzerRuns",
      description =
          "If set, we will output metadata about each monitor run and individual errors with bad configurations",
      required = false)
  protected String analyzerRuns;

  @Parameter(
      names = "-analyzerResultsPath",
      description = "Primary output of analysis",
      required = false)
  protected String analyzerResultsPath;

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
      names = "-dataDeletionRequestsPath",
      description =
          "Json files in DataDeletionRequest.class format indicating a user wants to purge some profiles and/or analyzer results",
      required = false)
  String dataDeletionRequestsPath;

  @Parameter(
      names = "-orgConfig",
      description =
          "Dataservice OrganizationService.dumpOrgTableToS3() dumps out an org config table to S3 for EMR to pull in",
      required = false)
  private String orgConfig;

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
      names = "-embedableImageBasePath",
      description = "Where to sink embeddable images of anomalies",
      required = false)
  protected String embedableImageBasePath;

  @Parameter(
      names = {"-postgresBulkIngestionTriggerTopic"},
      description = "Kinesis topic to notify its time for a bulk insert")
  private String postgresBulkIngestionTriggerTopic;

  @Parameter(
      names = "-s3SnapshotStagingArea",
      description =
          "A temp location (typically S3) for files to be ingested for druid (events). Note, our infra code puts an S3 lifecycle on these snapshots so they don't stick around forever.",
      required = false)
  protected String s3SnapshotStagingArea;

  @Parameter(
      names = "-configRepo",
      description =
          "Temp location of a file with the latest monitor configs that we use to sidechain broadcast out to the cluster because joins are too expensive")
  protected String configRepo = "/tmp/config_" + UUID.randomUUID();

  public static final DeltalakeMergeCondition CONFIG_MERGE_CONDITION =
      DeltalakeMergeCondition.builder()
          .field(MonitorConfigV3Row.Fields.datasetId)
          .field(MonitorConfigV3Row.Fields.orgId)
          .field(MonitorConfigV3Row.Fields.bin)
          .build();

  private static final UserDefinedFunction extensionRemover =
      udf(new PathExtensionRemover(), DataTypes.StringType);

  public static final DeltalakeMergeCondition ORG_CONFIG_MERGE_CONDITION =
      DeltalakeMergeCondition.builder().field(WhyLogsRow.ORG_ID).build();

  public static final String ARCHIVE_CONST = "archive";
  public static final String EXISTING = "existing";
  List<String> inputPaths = new ArrayList<>();
  private Long datalakeWriteTs;

  @SneakyThrows
  @Override
  public void runBefore() {
    if (sparkMaster.startsWith("local")) {
      spark.sparkContext().setCheckpointDir("/tmp/spark/checkpoint");
    } else {
      spark.sparkContext().setCheckpointDir("hdfs:///user/spark/checkpoint");
    }
    datalakeWriteTs = currentTimestamp.toInstant().toEpochMilli();

    inputPaths.clear();

    super.runBefore();
    performDeleteDataRequests(
        spark, profilesDatalakeV2, analyzerResultsPath, dataDeletionRequestsPath, currentTimestamp);
    writeMonitorV3Config();

    // With hourly data we need to include today's S3 key prefixes in the glob
    val yesterday = DateTimeFormatter.ISO_LOCAL_DATE.format(this.currentTimestamp.minusDays(1));
    val today = DateTimeFormatter.ISO_LOCAL_DATE.format(this.currentTimestamp);

    for (val batchTimeText : Arrays.asList(yesterday, today)) {
      Preconditions.checkArgument(
          !StringUtils.isEmpty(source)
              || !StringUtils.isEmpty(asyncSource)
              || !StringUtils.isEmpty(singleRefProfileSource),
          "Either source or asyncSource must be populated");
      if (!StringUtils.isEmpty(source)) {
        String resolved = resolvePath(source, batchTimeText);
        if (new Path(resolved)
            .getFileSystem(spark.sparkContext().hadoopConfiguration())
            .exists(new Path(resolved))) {
          inputPaths.add(resolved);
        }
      }
      if (!StringUtils.isEmpty(asyncSource)) {
        String resolved = resolvePath(asyncSource, batchTimeText);
        if (new Path(resolved)
            .getFileSystem(spark.sparkContext().hadoopConfiguration())
            .exists(new Path(resolved))) {
          inputPaths.add(resolvePath(asyncSource, batchTimeText));
        }
      }
      if (!StringUtils.isEmpty(singleRefProfileSource)) {
        String resolved = resolvePath(singleRefProfileSource, batchTimeText);
        if (new Path(resolved)
            .getFileSystem(spark.sparkContext().hadoopConfiguration())
            .exists(new Path(resolved))) {
          inputPaths.add(resolvePath(singleRefProfileSource, batchTimeText));
        }
      }
    }
    log.info("Using source with datetime: {}", inputPaths);
  }

  public Dataset<Org> getOrgConfigs() {
    if (orgConfig == null) {
      return spark.createDataset(new ArrayList<>(), Encoders.bean(Org.class));
    }

    return spark.read().text(orgConfig).flatMap(new ReadOrgConfigJson(), Encoders.bean(Org.class));
  }

  /*
  @SneakyThrows
  public void runProfilesDatalakeV1Migration() {

    val orgs = getOrgConfigs();

    val df =
        FillMissingColumns.fillMissingColumnsWitNulls(
                DeltaTable.forPath(spark, profiles).toDF(), DatalakeRow.class.getDeclaredFields())
            .as(Encoders.bean(DatalakeRow.class));
    df.joinWith(orgs, df.col(DatalakeRow.Fields.orgId).equalTo(orgs.col(Org.Fields.orgId)), "left")
        .flatMap(new ProfilesDatalakeV0ToV1Row(), Encoders.bean(DatalakeRowV1.class))
        .write()
        .format("delta")
        .partitionBy(DatalakeRowV1.Fields.yyyymmdd)
        .mode(SaveMode.Overwrite)
        .save(profilesDatalakeV1);
  }*/

  private String resolvePath(String path, String batchTimeText) {
    if (noDate) {
      return path;
    } else {
      if (path.startsWith("/")) {
        return Paths.get(path).resolve(batchTimeText).toString();
      } else {
        return URI.create(path + "/").resolve(batchTimeText).toString();
      }
    }
  }

  public void performDeleteDataRequests(
      SparkSession spark,
      String profiles,
      String analyzerResultsPath,
      String dataDeletionRequestsPath,
      ZonedDateTime currentTimestamp) {
    if (dataDeletionRequestsPath != null) {
      val deletionRequests = getDataDeletionRequests(spark, dataDeletionRequestsPath);

      // Delete merged profile records from datalake
      List<Column> v2deleteProfileExpressions = new ArrayList<>();
      for (val d : deletionRequests) {
        if (d.getOrgId() == null || d.getDatasetId() == null) {
          log.error("Invalid deletion request, must be scoped to org and dataset {}", d);
          continue;
        }
        if (d.getDeleteProfiles() != null && d.getDeleteProfiles()) {
          Column v2DeleteProfileCondition =
              col(DatalakeRowV2.Fields.orgId).equalTo(lit(d.getOrgId()));
          v2DeleteProfileCondition =
              v2DeleteProfileCondition.and(
                  col(DatalakeRowV2.Fields.datasetId).equalTo(lit(d.getDatasetId())));
          if (d.getProfileStart() != null) {
            v2DeleteProfileCondition =
                v2DeleteProfileCondition.and(
                    col(DatalakeRowV2.Fields.datasetTimestamp)
                        .$greater$eq(lit(d.getProfileStart())));
          }
          if (d.getProfileEnd() != null) {
            v2DeleteProfileCondition =
                v2DeleteProfileCondition.and(
                    col(DatalakeRowV2.Fields.datasetTimestamp).lt(lit(d.getProfileEnd())));
          }
          if (d.getColumnName() != null) {
            v2DeleteProfileCondition =
                v2DeleteProfileCondition.and(
                    col(DatalakeRowV2.Fields.columnName).lt(lit(d.getColumnName())));
          }
          if (d.getBeforeUploadTs() != null) {
            v2DeleteProfileCondition =
                v2DeleteProfileCondition.and(
                    col(DatalakeRowV2.Fields.lastUploadTs).lt(lit(d.getBeforeUploadTs())));
          }
          // Only delete merged. If you also delete the RAW markers they'll get re-ingested, those
          // act
          // as a tombstone.
          v2DeleteProfileCondition =
              v2DeleteProfileCondition.and(
                  col(DatalakeRowV2.Fields.type).equalTo(lit(ProfileColumnType.MERGED.name())));

          v2deleteProfileExpressions.add(v2DeleteProfileCondition);
        }

        if (v2deleteProfileExpressions.size() > 0) {
          Column v2deleteClause = null;
          for (val c : v2deleteProfileExpressions) {
            if (v2deleteClause == null) {
              v2deleteClause = c;
            } else {
              v2deleteClause = v2deleteClause.or(c);
            }
          }

          if (profiles != null && DeltalakeWriter.doesTableExist(profiles)) {
            log.info("Deleting v1 profiles datalake with condition {}", v2deleteClause);
            Preconditions.checkArgument(
                v2deleteClause.toString().length() > 10,
                "Sanity check failed on expression " + v2deleteClause);
            DeltaTable.forPath(spark, profiles).delete(v2deleteClause);
          }
        }
      }

      // Delete analyzer results
      List<Column> deleteAnalyzerResultExpressions = new ArrayList<>();
      for (val d : deletionRequests) {
        if (d.getOrgId() == null || d.getDatasetId() == null) {
          log.error("Invalid deletion request, must be scoped to org and dataset {}", d);
          continue;
        }
        if (d.getDeleteAnalyzerResults() != null && d.getDeleteAnalyzerResults()) {
          Column expression = col(Fields.orgId).equalTo(lit(d.getOrgId()));
          expression = expression.and(col(Fields.datasetId).equalTo(lit(d.getDatasetId())));
          if (d.getAnalyzerResultsStart() != null) {
            expression =
                expression.and(
                    col(AnalyzerResult.Fields.datasetTimestamp)
                        .$greater$eq(lit(d.getAnalyzerResultsStart())));
          }
          if (d.getAnalyzerResultsEnd() != null) {
            expression =
                expression.and(
                    col(AnalyzerResult.Fields.datasetTimestamp).lt(lit(d.getAnalyzerResultsEnd())));
          }
          if (!StringUtils.isEmpty(d.getAnalyzerId())) {
            expression =
                expression.and(
                    col(AnalyzerResult.Fields.analyzerId).equalTo(lit(d.getAnalyzerId())));
          }
          deleteAnalyzerResultExpressions.add(expression);
        }

        if (deleteAnalyzerResultExpressions.size() > 0) {
          Column deleteClause = null;
          for (val c : deleteAnalyzerResultExpressions) {
            if (deleteClause == null) {
              deleteClause = c;
            } else {
              deleteClause = deleteClause.or(c);
            }
          }

          log.info("Deleting analyzer results with condition {}", deleteClause);
          Preconditions.checkArgument(
              deleteClause.toString().length() > 10,
              "Sanity check failed on expression " + deleteClause);
          DeltaTable.forPath(spark, analyzerResultsPath).delete(deleteClause);
        }
      }

      archiveDataDeletionRequests(deletionRequests, dataDeletionRequestsPath);
    } else {
      log.info(
          "Data delection requests only kick off at midnight when we replace instead of append data");
    }
  }

  @SneakyThrows
  private List<DataDeletionRequest> getDataDeletionRequests(
      SparkSession spark, String dataDeletionRequestsPath) {
    if (!dataDeletionRequestsPath.endsWith("/")) {
      dataDeletionRequestsPath = dataDeletionRequestsPath + "/";
    }

    if (!FileSystem.get(new URI(dataDeletionRequestsPath), new Configuration())
        .exists(new Path(dataDeletionRequestsPath))) {
      log.info("Data deletion requests path does not exist, nothing to delete");
      return new ArrayList<>();
    }

    return spark
        .read() //
        .format("binaryFile") //
        .option("pathGlobFilter", "*.json") //
        .load(dataDeletionRequestsPath)
        .as(Encoders.bean(BinaryFileRow.class))
        .flatMap(new BinFileToDataDeleteionRequest(), Encoders.bean(DataDeletionRequest.class))
        // Prevent an API abuser from wrecking our job perf, only issue 100/run
        .limit(100)
        .collectAsList();
  }

  /**
   * Move the requests to [dataDeletionRequestsPath]/archive so we have an audit trail of deletions
   * we executed.
   */
  @SneakyThrows
  private void archiveDataDeletionRequests(
      List<DataDeletionRequest> deletionRequests, String dataDeletionRequestsPath) {
    val c = new Configuration();
    for (val d : deletionRequests) {
      val pieces = d.getRequestFilename().toString().split("/");
      String filename = pieces[pieces.length - 1];
      String tmpFile = "/tmp/" + filename;
      String archiveBasePath = dataDeletionRequestsPath + "/" + ARCHIVE_CONST + "/";
      String archiveFile = archiveBasePath + filename;
      log.info("Deletion complete, removing request file {}", d.getRequestFilename());
      FileSystem fs = FileSystem.get(new URI(d.getRequestFilename().replace(" ", "")), c);
      fs.mkdirs(new Path(archiveBasePath));
      fs.copyToLocalFile(new Path(d.getRequestFilename()), new Path(tmpFile));
      fs.copyFromLocalFile(new Path(tmpFile), new Path(archiveFile));
      fs.delete(new Path(d.getRequestFilename()), false);
    }
  }

  @SneakyThrows
  private Dataset<BinaryProfileRow> getProfileBins() {
    List<BinaryProfileRow> rows = new ArrayList<>();

    for (val input : inputPaths) {
      val fs = FileSystem.get(new URI(input), new Configuration());
      val i = fs.listFiles(new Path(input), false);
      while (i.hasNext()) {
        val n = i.next();
        if (n.getPath().toString().endsWith(".bin")) {
          if (n.getLen() > 0) {
            rows.add(
                BinaryProfileRow.builder()
                    .path(n.getPath().toString())
                    .modificationTime(new Timestamp(n.getModificationTime()))
                    .length(n.getLen())
                    .build());
          }
        }
      }
    }

    val df = spark.createDataset(rows, Encoders.bean(BinaryProfileRow.class));

    return df.withColumn(
            BinaryProfileRow.Fields.pathNoExtension,
            extensionRemover.apply(df.col(BinaryProfileRow.Fields.path)))
        .as(Encoders.bean(BinaryProfileRow.class));
  }

  public void writeV2NativeDatalake(Dataset<V1FileDescriptor> inputProfiles) {
    spark
        .udf()
        .register(
            ExtractOrgIdFromPath.UDF_NAME,
            functions.udf(new ExtractOrgIdFromPath(), DataTypes.StringType));

    inputProfiles =
        inputProfiles
            .drop(V1FileDescriptor.Fields.orgId)
            .withColumn(
                V1FileDescriptor.Fields.orgId,
                callUDF(ExtractOrgIdFromPath.UDF_NAME, col(V1FileDescriptor.Fields.path)))
            .as(Encoders.bean(V1FileDescriptor.class));

    val orgs = getOrgConfigs();

    val v1Rows =
        inputProfiles
            .joinWith(
                orgs,
                inputProfiles
                    .col(V1FileDescriptor.Fields.orgId)
                    .equalTo(orgs.col(Org.Fields.orgId)),
                "left")
            .map(new PopulateDescriptorFromOrgConfig(), Encoders.bean(V1FileDescriptor.class))
            .flatMap(
                new ProfileToDatalakeRows(currentTimestamp.toInstant().toEpochMilli()),
                Encoders.bean(DatalakeRowV1.class));

    // Avoid a double dip to S3
    v1Rows.checkpoint();
    runIndividualProfileAnalyzers(v1Rows);

    // Collapse the metrics together to make the datalake less vertical
    MigrateV2ProfileDatalake.convert(mergeV1Rows(v1Rows, spark))
        .coalesce(10)
        .write()
        .partitionBy(DatalakeRowV1.Fields.yyyymmdd)
        .format(DeltalakeWriter.DELTA)
        .mode(SaveMode.Append)
        .save(profilesDatalakeV2);
  }

  /**
   * Individual profiles can be pretty bulky so we analyze them at ingestion time and we only
   * analyze them once ever. We no longer support automatic backfills for individual profile
   * analyzers because its too expensive of a feature to support with our existing flows.
   *
   * @param v1Rows
   */
  private void runIndividualProfileAnalyzers(Dataset<DatalakeRowV1> v1Rows) {
    if (monitorConfigV3 == null || !DeltalakeWriter.doesTableExist(monitorConfigV3)) {
      return;
    }
    val job = new EventsJobV3();

    job.setProfilesDatalakeV2(profilesDatalakeV2);
    job.setPostgresBulkIngestionTriggerTopic(postgresBulkIngestionTriggerTopic);
    job.setSirenEveryAnomalyDatalake(sirenEveryAnomalyDatalake);
    job.setSirenDigestDatalake(sirenDigestDatalake);
    job.setEmbedableImageBasePath(embedableImageBasePath);
    job.setSirenV2AlertSqsTopic(sirenV2AlertSqsTopic);
    job.setNearRealTimeAlertSqsTopic(nearRealTimeAlertSqsTopic);
    job.setMonitorsConfigV3(monitorConfigV3);
    job.setS3SnapshotStagingArea(s3SnapshotStagingArea);
    job.setAnalyzerRuns(analyzerRuns);
    job.setAnalyzerResultsPath(analyzerResultsPath);
    job.setCurrentTimestamp(currentTimestamp);
    job.setForceLatestConfigVersion(true);
    job.setSpark(spark);
    job.setRunId(UUID.randomUUID().toString());
    job.setSparkMaster(sparkMaster);
    job.setConfigRepo(configRepo);
    // Only run the individual profile analyzers
    job.setIndividualProfileMonitoringMode(true);

    job.runBefore();
    job.cacheMonitorConfig();
    val unmergedGranularRows =
        job.explodeV2Rows(
            MigrateV2ProfileDatalake.convert(
                v1Rows.filter(
                    col(DatalakeRowV2.Fields.enableGranularDataStorage).equalTo(lit(true)))));

    val analysis = job.getMonitorMetrics(unmergedGranularRows);
    if (!analysis.isEmpty()) {
      job.runAfter(analysis.toDF());
    }
  }

  /**
   * For the same dataset/col/segment/timestamp/metricpath/etc, collapse as many records as we can.
   * Scenario here would be logging in a distributed enviro where many machines are uploading
   * mergable profiles for the same datapoint.
   */
  public static Dataset<DatalakeRowV1> mergeV1Rows(
      Dataset<DatalakeRowV1> inputRows, SparkSession spark) {
    List<String> groupBy = new ArrayList<>();
    groupBy.addAll(
        Arrays.asList(
            // OrgId is hard coded as the 1st position in the groupBy (b/c spark's API signatures
            // are the worst)
            DatalakeRowV1.Fields.datasetId,
            DatalakeRowV1.Fields.metricPath,
            DatalakeRowV1.Fields.segmentText,
            DatalakeRowV1.Fields.datasetType,
            DatalakeRowV1.Fields.datasetTimestamp,
            DatalakeRowV1.Fields.columnName,
            DatalakeRowV1.Fields.originalFilename,
            DatalakeRowV1.Fields.mergeableSegment,
            DatalakeRowV1.Fields.referenceProfileId,
            DatalakeRowV1.Fields.ingestionOrigin,
            DatalakeRowV1.Fields.type,
            DatalakeRowV1.Fields.datasetTags,
            DatalakeRowV1.Fields.mergedRecordWritten));

    spark
        .udf()
        .register(
            RegressionProfileMergeUdaf.UDAF_NAME,
            functions.udaf(new RegressionProfileMergeUdaf(), Encoders.BINARY()));
    spark
        .udf()
        .register(HllMergeUdaf.UDAF_NAME, functions.udaf(new HllMergeUdaf(), Encoders.BINARY()));
    spark
        .udf()
        .register(KLLMergeUdaf.UDAF_NAME, functions.udaf(new KLLMergeUdaf(), Encoders.BINARY()));

    spark
        .udf()
        .register(
            FrequentStringItemsMergeUdaf.UDAF_NAME,
            functions.udaf(new FrequentStringItemsMergeUdaf(), Encoders.BINARY()));
    spark
        .udf()
        .register(
            ClassificationMetricMergeUdaf.UDAF_NAME,
            functions.udaf(new ClassificationMetricMergeUdaf(), Encoders.BINARY()));

    spark
        .udf()
        .register(
            VarianceMergeUdaf.UDAF_NAME,
            functions.udaf(new VarianceMergeUdaf(), Encoders.BINARY()));

    UserDefinedFunction varianceEncoder = udf(new VarianceToBytes(), DataTypes.BinaryType);
    UserDefinedFunction varianceExtractor = udf(new VarianceExtract(), DoubleType);

    spark
        .udf()
        .register(VarianceToBytes.COL, functions.udf(new VarianceToBytes(), DataTypes.BinaryType));
    spark
        .udf()
        .register(VarianceExtract.COL, functions.udf(new VarianceExtract(), DataTypes.BinaryType));

    spark
        .udf()
        .register(
            AddYearMonthDay.UDF_NAME, functions.udf(new AddYearMonthDay(), DataTypes.StringType));

    val merged =
        inputRows
            .filter(col(DatalakeRowV1.Fields.type).equalTo(lit(ProfileColumnType.MERGED.name())))
            /* UDAFs with arrays are really tricky, so we encode variance into a byte[] for aggregation sake */
            .withColumn("va", varianceEncoder.apply(col(DatalakeRowV1.Fields.variance)))
            .drop(col(DatalakeRowV1.Fields.variance))
            .withColumnRenamed("va", DatalakeRowV1.Fields.variance)
            .groupBy(DatalakeRowV1.Fields.orgId, groupBy.stream().toArray(String[]::new))
            .agg(
                functions
                    .max(col(DatalakeRowV1.Fields.lastUploadTs))
                    .as(DatalakeRowV1.Fields.lastUploadTs),
                functions
                    .max(col(DatalakeRowV1.Fields.datalakeWriteTs))
                    .as(DatalakeRowV1.Fields.datalakeWriteTs),
                functions.max(col(DatalakeRowV1.Fields.dMax)).as(DatalakeRowV1.Fields.dMax),
                functions.max(col(DatalakeRowV1.Fields.nMax)).as(DatalakeRowV1.Fields.nMax),
                functions.min(col(DatalakeRowV1.Fields.dMin)).as(DatalakeRowV1.Fields.dMin),
                functions.min(col(DatalakeRowV1.Fields.nMin)).as(DatalakeRowV1.Fields.nMin),
                functions
                    .sum(col(DatalakeRowV1.Fields.nSum))
                    .cast("long")
                    .as(DatalakeRowV1.Fields.nSum),
                functions
                    .first(DatalakeRowV1.Fields.unmergeableD)
                    .as(DatalakeRowV1.Fields.unmergeableD),
                functions.first(DatalakeRowV1.Fields.traceId).as(DatalakeRowV1.Fields.traceId),
                functions.sum(col(DatalakeRowV1.Fields.dSum)).as(DatalakeRowV1.Fields.dSum),
                callUDF(HllMergeUdaf.UDAF_NAME, col(DatalakeRowV1.Fields.hll))
                    .as(DatalakeRowV1.Fields.hll),
                callUDF(KLLMergeUdaf.UDAF_NAME, col(DatalakeRowV1.Fields.kll))
                    .as(DatalakeRowV1.Fields.kll),
                callUDF(
                        FrequentStringItemsMergeUdaf.UDAF_NAME,
                        col(DatalakeRowV1.Fields.frequentItems))
                    .as(DatalakeRowV1.Fields.frequentItems),
                callUDF(
                        RegressionProfileMergeUdaf.UDAF_NAME,
                        col(DatalakeRowV1.Fields.regressionProfile))
                    .as(DatalakeRowV1.Fields.regressionProfile),
                callUDF(
                        ClassificationMetricMergeUdaf.UDAF_NAME,
                        col(DatalakeRowV1.Fields.classificationProfile))
                    .as(DatalakeRowV1.Fields.classificationProfile),
                callUDF(VarianceMergeUdaf.UDAF_NAME, col(DatalakeRowV1.Fields.variance))
                    .as(DatalakeRowV1.Fields.variance))
            .withColumn(
                "ve",
                functions.array(
                    varianceExtractor.apply(col(DatalakeRowV1.Fields.variance), lit(0)),
                    varianceExtractor.apply(col(DatalakeRowV1.Fields.variance), lit(1)),
                    varianceExtractor.apply(col(DatalakeRowV1.Fields.variance), lit(2))))
            .drop(DatalakeRowV1.Fields.variance)
            .withColumnRenamed("ve", DatalakeRowV1.Fields.variance)
            .withColumn(DatalakeRowV1.Fields.enableGranularDataStorage, lit(false))
            .withColumn(
                DatalakeRowV1.Fields.yyyymmdd,
                callUDF(AddYearMonthDay.UDF_NAME, col(DatalakeRowV1.Fields.datasetTimestamp)))
            .as(Encoders.bean(DatalakeRowV1.class));

    val unmergableRows =
        inputRows
            .filter(
                col(DatalakeRowV1.Fields.type)
                    .equalTo(ProfileColumnType.RAW.name())
                    .or(col(DatalakeRowV1.Fields.type).equalTo(ProfileColumnType.REFERENCE.name())))
            .toDF()
            // Don't ask me why spark's messing up the casing on these, but we have to fix it in
            // order for the union to work
            .withColumnRenamed("DMax", DatalakeRowV1.Fields.dMax)
            .withColumnRenamed("DMin", DatalakeRowV1.Fields.dMin)
            .withColumnRenamed("DSum", DatalakeRowV1.Fields.dSum)
            .withColumnRenamed("NMax", DatalakeRowV1.Fields.nMax)
            .withColumnRenamed("NMin", DatalakeRowV1.Fields.nMin)
            .withColumnRenamed("NSum", DatalakeRowV1.Fields.nSum);

    return new DatasetUnionHelper(Arrays.asList(merged.toDF(), unmergableRows.toDF()))
        .getUnion()
        .as(Encoders.bean(DatalakeRowV1.class));
  }

  @Override
  public Dataset<Row> calculate() {
    return null;
  }

  public static class PathExtensionRemover implements UDF1<String, String> {

    /**
     * LogAsync in S3 arrives with a pair of files
     * org-9758-model-1-6lNVpjQH2DQ5juwU9fqHT0gqvOOgAY5d.bin
     * org-9758-model-1-6lNVpjQH2DQ5juwU9fqHT0gqvOOgAY5d.json
     *
     * <p>We want to crop that to no extension so that we can join the bin with its partner json
     * metadata file. org-9758-model-1-6lNVpjQH2DQ5juwU9fqHT0gqvOOgAY5d
     */
    @Override
    public String call(String s) throws Exception {
      return FilenameUtils.removeExtension(s);
    }
  }

  @SneakyThrows
  @Override
  public void runAfter(Dataset<Row> df) {
    if (profilesDatalakeV2 == null) {
      return;
    }

    Dataset<BinaryProfileRow> binDf = getProfileBins();
    Dataset<V1FileDescriptor> inputProfiles =
        binDf
            .select("path", "modificationTime", "length")
            .withColumn(V1FileDescriptor.Fields.enableGranularDataStorage, lit(null))
            .withColumn(V1FileDescriptor.Fields.ingestionGranularity, lit(null))
            .withColumn(V1FileDescriptor.Fields.orgId, lit(null))
            .as(Encoders.bean(V1FileDescriptor.class));

    spark
        .udf()
        .register(
            ExtractOrgIdFromPath.UDF_NAME,
            functions.udf(new ExtractOrgIdFromPath(), DataTypes.StringType));

    if (DeltalakeWriter.doesTableExist(profilesDatalakeV2)) {
      val alreadyIngested =
          DeltaTable.forPath(spark, profilesDatalakeV2)
              .toDF()
              .select(DatalakeRowV1.Fields.originalFilename)
              .filter(col(DatalakeRowV1.Fields.originalFilename).isNotNull())
              .withColumnRenamed(DatalakeRowV1.Fields.originalFilename, EXISTING);
      // Dedupe
      inputProfiles =
          inputProfiles
              .join(
                  alreadyIngested,
                  binDf.col("path").equalTo(alreadyIngested.col(EXISTING)),
                  AbstractTransformationJob.LEFT_JOIN)
              // Skip already ingested profiles
              .filter(col(EXISTING).isNull())
              .drop(EXISTING)
              .as(Encoders.bean(V1FileDescriptor.class));
    }
    writeV2NativeDatalake(inputProfiles);
    log.info("Compactions complete");
  }

  public static class ClearRawRecordContent implements UDF2<byte[], String, byte[]> {

    @Override
    public byte[] call(byte[] bytes, String type) throws Exception {
      if (ProfileColumnType.RAW.equals(ProfileColumnType.valueOf(type))) {
        return new byte[0];
      } else {
        return bytes;
      }
    }
  }

  public static class CalculateHourlyRollupTimestamp implements UDF1<Long, Long> {

    @Override
    public Long call(Long ts) {
      if (ts == null) {
        ts = 0l;
      }
      Instant i = Instant.ofEpochMilli(ts);
      return ZonedDateTime.ofInstant(i, ZoneOffset.UTC)
          .truncatedTo(ChronoUnit.HOURS)
          .toInstant()
          .toEpochMilli();
    }
  }

  @SneakyThrows
  private void writeMonitorV3Config() {
    if (StringUtils.isEmpty(monitorConfigV3Changes)) {
      log.info("Monitor config changes not configured, skipping");
      return;
    }

    val yesterday = DateTimeFormatter.ISO_LOCAL_DATE.format(this.currentTimestamp.minusDays(1));
    val today = DateTimeFormatter.ISO_LOCAL_DATE.format(this.currentTimestamp);
    List<String> configPaths = new ArrayList<>();
    Configuration c = new Configuration();
    for (val batchTimeText : Arrays.asList(yesterday, today)) {
      String resolved = resolvePath(monitorConfigV3Changes, batchTimeText) + "/*/*/*";
      if (FileSystem.get(new URI(resolved), c).globStatus(new Path(resolved)).length > 0) {
        configPaths.add(resolved);
      } else {
        log.warn("Empty path {}", resolved);
      }
    }

    Dataset<Row> rawDf =
        spark
            .read() //
            .format("binaryFile") //
            .option("pathGlobFilter", "*.json")
            .option("recursiveFileLookup", "true")
            .load(JavaConverters.asScalaBuffer(configPaths));
    if (rawDf.isEmpty()) {
      log.warn("Empty DF, no monitor config updates");
      return;
    }

    val configs =
        rawDf
            .withColumn(BinaryProfileRow.Fields.pathNoExtension, lit(null))
            .withColumn(BinaryProfileRow.Fields.profileId, lit(null))
            .as(Encoders.bean(BinaryProfileRow.class))
            .flatMap(
                new ConfigV3JsonFileToMonitorConfigV3Row(),
                Encoders.bean(MonitorConfigV3Row.class));
    configs.registerTempTable("confs");

    String cols =
        StringUtils.join(
            ImmutableList.of(
                    MonitorConfigV3Row.Fields.datasetId,
                    MonitorConfigV3Row.Fields.orgId,
                    MonitorConfigV3Row.Fields.jsonConf,
                    MonitorConfigV3Row.Fields.id,
                    MonitorConfigV3Row.Fields.updatedTs,
                    MonitorConfigV3Row.Fields.bin)
                .toArray(),
            ",");

    // There could be many config edits, grab only the most recent one
    Dataset<Row> df =
        configs
            .sqlContext()
            .sql(
                "select "
                    + cols
                    + " from (select *, row_number() OVER (PARTITION BY orgId, datasetId ORDER BY updatedTs DESC) as rn from confs) tmp where rn = 1");

    DeltalakeWriter.builder()
        .dataset(df) //
        .path(monitorConfigV3) //
        .mergeCondition(CONFIG_MERGE_CONDITION) //
        .updateExisting(true)
        .build() //
        .execute();
  }

  public static void main(String[] args) {
    try (val job = new WhylogDeltalakeWriterJob()) {
      job.run(args);
    }
  }
}
