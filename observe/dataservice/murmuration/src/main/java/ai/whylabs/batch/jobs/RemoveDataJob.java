package ai.whylabs.batch.jobs;

import static org.apache.spark.sql.functions.col;
import static org.apache.spark.sql.functions.lit;

import ai.whylabs.batch.jobs.base.AbstractSparkJob;
import ai.whylabs.core.structures.DatalakeRow;
import ai.whylabs.core.structures.DatalakeRow.Fields;
import com.beust.jcommander.JCommander.Builder;
import com.beust.jcommander.Parameter;
import io.delta.tables.DeltaTable;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import org.apache.spark.sql.Column;
import org.apache.spark.sql.Dataset;
import org.apache.spark.sql.Row;
import org.joda.time.Interval;

@Slf4j
public class RemoveDataJob extends AbstractSparkJob {

  @Parameter(
      names = {"-location", "-datalake"},
      description =
          "optional deltalake location for profiles destined for druid; if supplied, matching entries will be deleted.")
  private String profilesDatalake;

  @Parameter(
      names = {"-targetOrgId", "-orgId"},
      description = "required orgId in matching records",
      required = true)
  private String targetOrgId;

  @Parameter(
      names = {"-targetDatasetId", "-datasetId"},
      description = "optional datasetId in matching records")
  private String targetDatasetId;

  @Parameter(
      names = "-interval",
      description =
          "Optional ISO-8601 Interval [open on right);\ne.g \"2021-03-01T00:00:00.000/2021-03-05T00:00:00.000\" or \"2021-03-01T00:00:00.000/P5D\"")
  private String interval;

  @Parameter(
      names = {"-dryrun", "-dry-run"},
      description = "Show what would be deleted without actually deleting")
  private Boolean dryrun;

  @Parameter(
      names = {"-delete-missing-data"},
      description = "Delete missing-data and missing profile alerts; by default these are ignored.")
  private Boolean deleteMissingData;

  public Dataset<Row> calculate() {

    Column sharedFilter = col(Fields.orgId).equalTo(lit(targetOrgId));
    if (targetDatasetId != null) {
      sharedFilter = sharedFilter.and(col(Fields.datasetId).equalTo(lit(targetDatasetId)));
    }

    if (profilesDatalake != null) {
      Column filter = sharedFilter;
      if (interval != null) {
        val d = Interval.parse(interval);
        filter =
            filter
                .and(col(Fields.ts).geq(lit(d.getStartMillis())))
                .and(col(Fields.ts).lt(lit(d.getEndMillis())));
      }

      val delta = DeltaTable.forPath(spark, profilesDatalake);
      if (!sparkMaster.startsWith("local")) {
        // Conditional speeds up unit tests
        delta
            .toDF()
            .select(Fields.ts, Fields.orgId, Fields.datasetId, Fields.tags, Fields.originalFilename)
            .filter(filter)
            .filter(col(Fields.originalFilename).isNotNull())
            .orderBy(col(DatalakeRow.Fields.ts).asc())
            .show(500, 500);
      }
      if (dryrun == null || !dryrun) {
        delta.delete(filter);
      }
    }

    return null;
  }

  @Override
  protected Builder parserBuilder() {
    // do not accept unknown options
    return super.parserBuilder().acceptUnknownOptions(false);
  }

  public static void main(String[] args) {
    new RemoveDataJob().run(args);
  }
}
