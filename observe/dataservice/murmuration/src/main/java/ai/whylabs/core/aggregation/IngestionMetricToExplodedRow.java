package ai.whylabs.core.aggregation;

import ai.whylabs.core.configV3.structure.enums.TargetLevel;
import ai.whylabs.core.enums.AggregationDataGranularity;
import ai.whylabs.core.structures.ExplodedRow;
import ai.whylabs.core.structures.IngestionMetric;
import ai.whylabs.druid.whylogs.column.DatasetMetrics;
import lombok.val;

public class IngestionMetricToExplodedRow {

  public static ExplodedRow get(IngestionMetric ingestionMetric) {
    val e =
        ExplodedRow.builder()
            .segmentText(ingestionMetric.getSegment())
            .orgId(ingestionMetric.getOrgId())
            .lastUploadTs(ingestionMetric.getLastUploadTs())
            .targetLevel(TargetLevel.dataset)
            .rowTerminator(false)
            .feedbackRow(false)
            .ingestionMetricRow(true)
            .columnName(DatasetMetrics.DATASET_METRICS)
            .ts(ingestionMetric.getTargetTimestamp())
            .datasetId(ingestionMetric.getDatasetId())
            .subPartition(0)
            .aggregationDataGranularity(AggregationDataGranularity.ROLLED_UP)
            .build();
    return e;
  }
}
