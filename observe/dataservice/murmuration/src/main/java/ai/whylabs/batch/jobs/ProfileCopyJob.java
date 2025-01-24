package ai.whylabs.batch.jobs;

import static org.apache.spark.sql.functions.col;
import static org.apache.spark.sql.functions.lit;
import static org.apache.spark.sql.functions.udf;

import ai.whylabs.batch.jobs.base.AbstractSparkJob;
import ai.whylabs.batch.utils.DeltalakeWriter;
import ai.whylabs.core.enums.IngestionOrigin;
import ai.whylabs.core.enums.ProfileColumnType;
import ai.whylabs.core.structures.DatalakeRow;
import ai.whylabs.core.structures.DatalakeRow.Fields;
import ai.whylabs.core.utils.BinParser;
import ai.whylabs.druid.whylogs.metadata.BinMetadataEnforcer;
import com.beust.jcommander.Parameter;
import com.whylogs.v0.core.message.DatasetProfileMessage;
import io.delta.tables.DeltaTable;
import java.io.ByteArrayOutputStream;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import org.apache.spark.sql.Dataset;
import org.apache.spark.sql.Row;
import org.apache.spark.sql.SaveMode;
import org.apache.spark.sql.api.java.UDF1;
import org.apache.spark.sql.expressions.UserDefinedFunction;
import org.apache.spark.sql.types.DataTypes;

/**
 * Utility class to take take some profiles from one org+dataset and copy them to another
 * org+dataset. Sample params
 *
 * <p>spark-submit --deploy-mode client -sourceOrgId org-0 -sourceDatasetId model-0 -targetOrgId
 * org-3615 -targetDatasetId model-1 -sourceStart 2021-06-15T00:00:07Z -sourceEnd
 * 2021-07-15T00:00:07Z -offsetDays 1 -location
 * s3://development-deltalake-20210520193724829400000001/whylogs/
 */
@Slf4j
public class ProfileCopyJob extends AbstractSparkJob {

  @Parameter(names = "-location", description = "Location of delta lake", required = true)
  private String location;

  @Parameter(names = "-sourceOrgId", description = "Org Id to copy data from", required = true)
  private String sourceOrgId;

  @Parameter(names = "-sourceDatasetId", description = "Dataset Id to copy from", required = true)
  private String sourceDatasetId;

  @Parameter(
      names = "-sourceStart",
      description = "Interval to copy data from. 2021-03-01T00:00:00.000",
      required = true)
  private String sourceStart;

  @Parameter(
      names = "-sourceEnd",
      description = "Interval to copy data from. 2021-04-01T00:00:00.000",
      required = true)
  private String sourceEnd;

  @Parameter(names = "-targetOrgId", description = "Org Id to write to", required = true)
  private String targetOrgId;

  @Parameter(names = "-targetDatasetId", description = "Dataset Id to copy from", required = true)
  private String targetDatasetId;

  @Parameter(
      names = "-offsetDays",
      description = "Scoot all the timestamps forward by x days",
      required = true)
  private Integer offsetDays;

  public Dataset<Row> calculate() {
    ZonedDateTime start = ZonedDateTime.parse(sourceStart, DateTimeFormatter.ISO_OFFSET_DATE_TIME);
    ZonedDateTime end = ZonedDateTime.parse(sourceEnd, DateTimeFormatter.ISO_OFFSET_DATE_TIME);

    val dt = DeltaTable.forPath(spark, location);
    val ts = col(DatalakeRow.Fields.ts);

    UserDefinedFunction timestampAdvancer =
        udf(new AdvanceTimestamp(offsetDays), DataTypes.LongType);

    UserDefinedFunction orgDatasetEnforcer =
        udf(
            new RewriteOrgAndDataset(targetOrgId, targetDatasetId, offsetDays),
            DataTypes.BinaryType);

    String oldTs = "oldTs";
    String oldContent = "oldContent";
    Dataset<Row> source =
        dt.toDF()
            .filter(col(Fields.type).equalTo(lit(ProfileColumnType.MERGED.name())))
            .filter(ts.geq(start.toInstant().toEpochMilli()))
            .filter(ts.lt(end.toInstant().toEpochMilli()))
            .filter(Fields.orgId + " = \"" + sourceOrgId + "\"")
            .filter(Fields.datasetId + " = \"" + sourceDatasetId + "\"")
            .drop(Fields.orgId)
            .drop(Fields.datasetId)
            .drop(Fields.partition)
            .withColumn(Fields.orgId, lit(targetOrgId))
            .withColumn(Fields.partition, lit(targetOrgId))
            .withColumn(Fields.datasetId, lit(targetDatasetId))
            .withColumnRenamed(Fields.ts, oldTs)
            .withColumn(Fields.ts, timestampAdvancer.apply(col(oldTs)))
            .drop(oldTs)
            .withColumnRenamed(Fields.content, oldContent)
            .withColumn(Fields.content, orgDatasetEnforcer.apply(col(oldContent)))
            .drop(oldContent)
            .drop(Fields.ingestionOrigin)
            .withColumn(Fields.ingestionOrigin, lit(IngestionOrigin.ProfileCopyJob.name()));

    log.info("Writing {} rows", source.count());
    source.write().format(DeltalakeWriter.DELTA).mode(SaveMode.Append).save(location);
    return null;
  }

  public static class AdvanceTimestamp implements UDF1<Long, Long> {
    private Long offsetMillis;

    public AdvanceTimestamp(Integer offsetDays) {
      if (offsetDays == 0) {
        offsetMillis = 0l;
      } else {
        offsetMillis = offsetDays * 24 * 60 * 60 * 1000l;
      }
    }

    @Override
    public Long call(Long ts) throws Exception {
      return ts + offsetMillis;
    }
  }

  public static class RewriteOrgAndDataset implements UDF1<byte[], byte[]> {
    private String orgId;
    private String datasetId;
    private Long offsetMillis;

    public RewriteOrgAndDataset(String orgId, String datasetId, int offsetdays) {
      this.orgId = orgId;
      this.datasetId = datasetId;
      this.offsetMillis = offsetdays * 24 * 60 * 60 * 1000l;
    }

    private static transient BinMetadataEnforcer enforcer = new BinMetadataEnforcer();

    @Override
    public byte[] call(byte[] bytes) throws Exception {
      DatasetProfileMessage profileMessage = BinParser.parse(bytes);
      profileMessage =
          enforcer.enforce(
              profileMessage,
              orgId,
              datasetId,
              profileMessage.getProperties().getDataTimestamp() + offsetMillis,
              null,
              null);
      ByteArrayOutputStream baos = new ByteArrayOutputStream();
      profileMessage.writeDelimitedTo(baos);
      return baos.toByteArray();
    }
  }

  public static void main(String[] args) {
    new ProfileCopyJob().run(args);
  }
}
