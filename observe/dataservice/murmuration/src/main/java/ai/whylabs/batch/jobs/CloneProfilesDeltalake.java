package ai.whylabs.batch.jobs;

import ai.whylabs.batch.session.SparkSessionFactory;
import ai.whylabs.batch.utils.DeltalakeWriter;
import ai.whylabs.core.structures.DatalakeRow.Fields;
import com.beust.jcommander.JCommander;
import com.beust.jcommander.Parameter;
import io.delta.tables.DeltaTable;
import lombok.extern.slf4j.Slf4j;
import org.apache.spark.sql.Dataset;
import org.apache.spark.sql.Row;
import org.apache.spark.sql.SparkSession;
import org.apache.spark.sql.functions;

@Slf4j
public class CloneProfilesDeltalake {
  private SparkSession spark;

  @Parameter(
      names = "-sparkMaster",
      description = "local[2] for embeded mode with 2 cores, yarn-client to run driver on EMR",
      required = true)
  private String sparkMaster;

  @Parameter(names = "-src", description = "Location of delta lake", required = true)
  private String src;

  @Parameter(names = "-dest", description = "Dest location of delta lake", required = true)
  private String dest;

  @Parameter(names = "-orgId", description = "OrgId to limit to", required = false)
  private String orgId;

  @Parameter(names = "-datasetId", description = "DatasetId to limit to", required = false)
  private String datasetId;

  private void run() {
    Dataset<Row> rows = DeltaTable.forPath(spark, src).toDF();
    if (orgId != null) {
      rows = rows.filter(functions.col(Fields.orgId).equalTo(functions.lit(orgId)));
    }
    if (datasetId != null) {
      rows = rows.filter(functions.col(Fields.datasetId).equalTo(functions.lit(datasetId)));
    }

    rows.repartition(200)
        .write()
        .format(DeltalakeWriter.DELTA)
        .partitionBy(Fields.partition, Fields.type)
        .save(dest);
  }

  public void setSpark(SparkSession spark) {
    this.spark = spark;
  }

  public void run(String[] args) throws Exception {
    JCommander.newBuilder().addObject(this).build().parse(args);

    if (spark == null) {
      spark =
          SparkSessionFactory.getSparkSession(sparkMaster, null, this.getClass().getSimpleName());
    }

    run();
  }

  public static void main(String[] args) throws Exception {
    CloneProfilesDeltalake job = new CloneProfilesDeltalake();
    job.run(args);
  }
}
