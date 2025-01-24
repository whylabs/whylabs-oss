package ai.whylabs.batch.jobs;

import ai.whylabs.batch.session.SparkSessionFactory;
import ai.whylabs.batch.utils.DeltalakeWriter;
import com.beust.jcommander.JCommander;
import com.beust.jcommander.Parameter;
import io.delta.tables.DeltaTable;
import org.apache.spark.sql.Dataset;
import org.apache.spark.sql.Row;
import org.apache.spark.sql.SparkSession;

public class CloneAnalyzerResultsDeltalake {
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

  private void run() {
    Dataset<Row> rows = DeltaTable.forPath(spark, src).toDF();
    rows.write().format(DeltalakeWriter.DELTA).save(dest);
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
    CloneAnalyzerResultsDeltalake job = new CloneAnalyzerResultsDeltalake();
    job.run(args);
  }
}
