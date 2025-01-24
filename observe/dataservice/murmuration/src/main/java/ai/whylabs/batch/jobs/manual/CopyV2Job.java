package ai.whylabs.batch.jobs.manual;

import static org.apache.spark.sql.functions.col;

import ai.whylabs.batch.jobs.base.AbstractSparkJob;
import ai.whylabs.batch.utils.TableUtils;
import ai.whylabs.core.structures.DatalakeRowV2;
import com.beust.jcommander.Parameter;
import io.delta.tables.DeltaTable;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import org.apache.spark.sql.Dataset;
import org.apache.spark.sql.Row;
import org.apache.spark.sql.SaveMode;

/** A debug job for loading a deltalake. */
@Slf4j
public class CopyV2Job extends AbstractSparkJob {
  @Parameter(names = "-path", description = "Path of the deltalake table", required = true)
  private String path;

  public static void main(String[] args) {
    new CopyV2Job().run(args);
  }

  @Override
  public Dataset<Row> calculate() {
    val df =
        DeltaTable.forPath(path)
            .toDF()
            .filter("orgId='org-0'")
            .filter("datasetId='model-0'")
            .filter("columnName='mths_since_last_delinq'")
            .filter("yyyymmdd like '2023%'");

    log.info("copied {} rows", df.count());
    df.sort(col(DatalakeRowV2.Fields.yyyymmdd))
        .write()
        .format("delta")
        .mode(SaveMode.Overwrite)
        .partitionBy(DatalakeRowV2.Fields.yyyymmdd)
        .save(
            "s3://p-chris-artifacts20210625034127686000000001/org-0-model-0-mths_since_last_delinq-v2");

    val table = TableUtils.readLatestVersion(path);
    final Dataset<Row> rowDataset = table.toDF();
    rowDataset.printSchema();
    return rowDataset;
  }
}
