package ai.whylabs.batch.MapFunctions;

import ai.whylabs.core.structures.ColumnStatistic;
import ai.whylabs.core.structures.ColumnStatisticGrouped;
import ai.whylabs.core.structures.SirenDigestPayload;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.val;
import org.apache.spark.api.java.function.MapFunction;

@AllArgsConstructor
public class ColumnStatisticGroupedToSirenDigestPayload
    implements MapFunction<ColumnStatisticGrouped, SirenDigestPayload> {

  private String runId;

  @Override
  public SirenDigestPayload call(ColumnStatisticGrouped grouped) throws Exception {
    List<ColumnStatistic> columnStatistics = new ArrayList();
    for (int x = 0; x < grouped.getColumns().size(); x++) {
      val c =
          ColumnStatistic.builder()
              .column(grouped.getColumns().get(x))
              .numAnomalies(grouped.getNumAnomalies().get(x))
              .analyzerType(grouped.getAnalyzerType().get(x))
              .earliestAnomalyDatasetTimestamp(grouped.getEarliestAnomalyDatasetTimestamp())
              .oldestAnomalyDatasetTimestamp(grouped.getOldestAnomalyDatasetTimestamp())
              .build();
      columnStatistics.add(c);
    }
    val s =
        SirenDigestPayload.builder()
            .id(UUID.randomUUID().toString())
            .orgId(grouped.getOrgId())
            .monitorId(grouped.getMonitorId())
            .datasetId(grouped.getDatasetId())
            .runId(runId)
            .columnStatistics(columnStatistics);

    return s.build();
  }
}
