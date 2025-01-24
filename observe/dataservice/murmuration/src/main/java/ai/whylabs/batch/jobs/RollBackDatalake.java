package ai.whylabs.batch.jobs;

import ai.whylabs.batch.jobs.base.AbstractSparkJob;
import com.beust.jcommander.JCommander;
import com.beust.jcommander.Parameter;
import io.delta.tables.DeltaTable;
import org.apache.spark.sql.Dataset;
import org.apache.spark.sql.Row;

public class RollBackDatalake extends AbstractSparkJob {

  @Parameter(names = "-source", description = "Location of the datalake", required = true)
  protected String source;

  @Override
  public Dataset<Row> calculate() {
    DeltaTable.forPath(spark, source).restoreToTimestamp("2023-04-10");
    return null;
  }

  @Override
  protected JCommander.Builder parserBuilder() {
    // do not accept unknown options
    return super.parserBuilder().acceptUnknownOptions(false);
  }

  public static void main(String[] args) {
    new RollBackDatalake().run(args);
  }
}
