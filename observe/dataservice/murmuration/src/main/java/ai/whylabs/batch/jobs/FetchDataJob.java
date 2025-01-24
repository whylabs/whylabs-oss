package ai.whylabs.batch.jobs;

import static org.apache.spark.sql.functions.col;

import ai.whylabs.batch.aggregators.DataFetchUdaf;
import ai.whylabs.core.structures.ExplodedRow;
import ai.whylabs.core.structures.monitor.events.AnalyzerResult;
import com.beust.jcommander.Parameter;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import org.apache.spark.sql.Dataset;
import org.apache.spark.sql.Encoders;
import org.apache.spark.sql.Row;
import org.apache.spark.sql.functions;

/**
 * This job dumps out a baseline of any metric by throwing an exception. All the same params as the
 * event job plus a couple others. You'd typically wanna add
 *
 * <p>-orgId org-0 -datasetId model-0 -column acc_now_delinq -metricOfInterest count
 */
@Slf4j
public class FetchDataJob extends EventsJobV3 {

  @Parameter(names = "-column")
  private String column;

  @Parameter(names = "-metricOfInterest")
  private String metricOfInterest;

  public static void main(String[] args) {
    new FetchDataJob().run(args);
  }

  @Override
  public void apply(String[] args) {
    super.apply(args);
  }

  @Override
  public Dataset<Row> calculate() {

    val rows =
        getExplodedRows()
            .filter(col(ExplodedRow.Fields.columnName).equalTo(functions.lit(column)))
            .filter(col(ExplodedRow.Fields.orgId).isin(orgIds.toArray()))
            .filter(col(ExplodedRow.Fields.datasetId).equalTo(functions.lit(datasetId)));

    spark
        .udf()
        .register(
            "analyze",
            functions.udaf(
                new DataFetchUdaf(
                    currentTimestamp,
                    runId,
                    true,
                    embedableImageBasePath,
                    configRepo,
                    metricOfInterest),
                Encoders.bean(ExplodedRow.class)));

    Dataset<AnalyzerResult> monitorMetrics =
        rows.groupBy(
                functions.col(ExplodedRow.Fields.orgId),
                functions.col(ExplodedRow.Fields.datasetId),
                functions.col(ExplodedRow.Fields.columnName),
                functions.col(ExplodedRow.Fields.targetLevel),
                functions.col(ExplodedRow.Fields.segmentText),
                functions.col(ExplodedRow.Fields.aggregationDataGranularity),
                functions.col(ExplodedRow.Fields.subPartition))
            .agg(functions.expr("analyze(*)").as("r"))
            .select(functions.explode(col("r.results")))
            .select(col("col.*"))
            .as(Encoders.bean(AnalyzerResult.class));
    monitorMetrics.count();

    return null;
  }
}
