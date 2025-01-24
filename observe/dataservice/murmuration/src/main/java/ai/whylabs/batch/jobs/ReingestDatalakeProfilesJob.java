package ai.whylabs.batch.jobs;

import static org.apache.spark.sql.functions.col;
import static org.apache.spark.sql.functions.lit;

import ai.whylabs.batch.MapFunctions.RawRowToV1FileDescriptor;
import ai.whylabs.batch.jobs.base.AbstractSparkJob;
import ai.whylabs.core.enums.ProfileColumnType;
import ai.whylabs.core.structures.DatalakeRowV2;
import ai.whylabs.core.structures.V1FileDescriptor;
import ai.whylabs.core.utils.ConfigAwsSdk;
import com.beust.jcommander.Parameter;
import io.delta.tables.DeltaTable;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import org.apache.spark.sql.Dataset;
import org.apache.spark.sql.Encoders;
import org.apache.spark.sql.Row;
import org.joda.time.DateTimeZone;

/** Job that re-ingests profile data using the latest codebase */
@Slf4j
public class ReingestDatalakeProfilesJob extends AbstractSparkJob {

  @Parameter(
      names = "-profilesDatalakeV2",
      description =
          "Output location of the v2 profiles datalake. Similar to what's in PG, but collapsed down to multiple metrics per column")
  private String profilesDatalakeV2;

  @Parameter(names = "-orgId")
  private String orgId;

  @Parameter(names = "-datasetId")
  private String datasetId;

  @Override
  public Dataset<Row> calculate() {
    ConfigAwsSdk.defaults();
    DateTimeZone.setDefault(DateTimeZone.UTC);

    val currentTimestamp =
        ZonedDateTime.parse(currentTime, DateTimeFormatter.ISO_OFFSET_DATE_TIME)
            .truncatedTo(ChronoUnit.HOURS);

    val j = new WhylogDeltalakeWriterJob();
    j.setCurrentTimestamp(currentTimestamp);

    // The issue only appears prior to Oct 6 '23 so we're scoping the repair to that historical time
    // range
    long cutoff = 1696575600000l;

    val inputProfiles =
        DeltaTable.forPath(spark, profilesDatalakeV2)
            .toDF()
            .filter(col(DatalakeRowV2.Fields.datasetTimestamp).$less(lit(cutoff)))
            .filter(col(DatalakeRowV2.Fields.type).equalTo(lit(ProfileColumnType.RAW.name())))
            .filter(col(DatalakeRowV2.Fields.orgId).equalTo(lit(orgId)))
            .filter(col(DatalakeRowV2.Fields.datasetId).equalTo(lit(datasetId)))
            .flatMap(new RawRowToV1FileDescriptor(), Encoders.bean(V1FileDescriptor.class));

    j.setSpark(spark);
    j.profilesDatalakeV2 = profilesDatalakeV2;
    j.currentTimestamp = currentTimestamp;

    j.writeV2NativeDatalake(inputProfiles);

    DeltaTable.forPath(spark, profilesDatalakeV2)
        .delete(
            col(DatalakeRowV2.Fields.datasetId)
                .equalTo(lit(datasetId))
                .and(col(DatalakeRowV2.Fields.orgId).equalTo(lit(orgId)))
                .and(col(DatalakeRowV2.Fields.datasetTimestamp).$less(lit(cutoff)))
                .and(
                    col(DatalakeRowV2.Fields.datalakeWriteTs)
                        .$less(lit(currentTimestamp.toInstant().toEpochMilli()))));

    return null;
  }

  public static void main(String[] args) {
    try (val job = new ReingestDatalakeProfilesJob()) {
      job.run(args);
    }
  }
}
