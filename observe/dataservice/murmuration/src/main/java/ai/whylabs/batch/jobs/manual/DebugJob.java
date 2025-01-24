package ai.whylabs.batch.jobs.manual;

import ai.whylabs.batch.jobs.base.AbstractSparkJob;
import ai.whylabs.batch.utils.TableUtils;
import com.beust.jcommander.Parameter;
import io.delta.tables.DeltaTable;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import org.apache.spark.sql.Column;
import org.apache.spark.sql.Dataset;
import org.apache.spark.sql.Row;
import org.joda.time.Interval;

/** A debug job for loading a deltalake. */
@Slf4j
public class DebugJob extends AbstractSparkJob {
  @Parameter(names = "-path", description = "Path of the deltalake table", required = true)
  private String path;

  public static void main(String[] args) {
    new DebugJob().run(args);
  }

  @Override
  public Dataset<Row> calculate() {
    val interval = "2022-07-18/P10D";
    val d = Interval.parse(interval);

    DeltaTable.forPath("s3://development-deltalake-20210520193724829400000001/whylogs/")
        .toDF()
        .filter("orgId='org-nJdc5Q'")
        .filter("partition='org-nJdc5Q'")
        .filter("datasetId='model-5' AND type='RAW'")
        //        .filter(new Column("ts").$greater$eq(d.getStartMillis()))
        //        .filter(new Column("ts").$less(d.getEndMillis()))
        .drop("content")
        .orderBy(new Column("ts").desc())
        .show(100, 400);

    val table = TableUtils.readLatestVersion(path);
    final Dataset<Row> rowDataset = table.toDF();
    rowDataset.printSchema();
    return rowDataset;
  }
}
