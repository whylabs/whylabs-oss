package ai.whylabs.batch.MapFunctions;

import ai.whylabs.core.aggregation.IngestionMetricToExplodedRow;
import ai.whylabs.core.structures.ExplodedRow;
import ai.whylabs.core.structures.IngestionMetric;
import org.apache.spark.api.java.function.MapFunction;

/** Create a dataset level row with the latest timestamp per dataset/segment */
public class IngestionMetricToExplodedRowMapFunction
    implements MapFunction<IngestionMetric, ExplodedRow> {

  @Override
  public ExplodedRow call(IngestionMetric ingestionMetric) throws Exception {
    return IngestionMetricToExplodedRow.get(ingestionMetric);
  }
}
