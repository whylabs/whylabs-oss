package ai.whylabs.batch.jobs.base;

import ai.whylabs.core.query.DruidQueryParser;
import com.beust.jcommander.Parameter;
import java.util.List;
import lombok.NonNull;
import lombok.RequiredArgsConstructor;
import lombok.Setter;
import lombok.extern.slf4j.Slf4j;
import org.apache.spark.sql.Dataset;
import org.apache.spark.sql.Row;
import org.apache.spark.sql.SparkSession;

/** Extends this class if you want to run querying in transformation step */
@Slf4j
@RequiredArgsConstructor
@Deprecated
public abstract class AbstractTransformationJob extends AbstractSparkJob {

  public static final String LEFT_JOIN = "left";

  public static final String mostRecentDatasetTs = "newestDataTsWritten";

  @Parameter(names = "-source", description = "Location of the datalake", required = true)
  protected String source;

  protected final String queryFile;

  @Parameter(
      names = "-segmentsConfig",
      description = "Path of the deltalake table for segments data",
      required = false)
  protected String segmentsConfig;

  @Parameter(
      names = "-monitorsConfig",
      description = "Path of the deltalake table for monitor config data")
  protected String monitorsConfig;

  @Parameter(
      names = "-orgId",
      description = "Target org ID to filter data by. Useful when targing an organization")
  protected String orgId;

  @Parameter(
      names = "-datasetId",
      description =
          "Target dataset ID to filter the data by. Useful when working with a single dataset ID")
  protected String datasetId;

  @Parameter(
      names = "-enableDynamicLateWindowing",
      description =
          "Experimental turbo speed button: Scope late windowing to how far their data has been backfilled",
      required = false)
  protected boolean enableDynamicLateWindowing = true;

  @Setter protected transient DruidQueryParser queryParser;

  @Setter protected Dataset<Row> configSegments;
  @Setter protected Dataset<Row> profilesTable;

  public List<String> dimensions() {
    return queryParser.getGroupingDimensions();
  }

  @Override
  public void runBefore() {
    super.runBefore();

    this.queryParser = new DruidQueryParser(getDruidQuery(queryFile));
  }

  public void init(@NonNull SparkSession spark, @NonNull DruidQueryParser queryParser) {
    this.spark = spark;
    this.queryParser = queryParser;
  }
}
