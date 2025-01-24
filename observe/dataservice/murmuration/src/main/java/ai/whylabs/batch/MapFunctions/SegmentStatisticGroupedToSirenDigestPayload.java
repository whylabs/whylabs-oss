package ai.whylabs.batch.MapFunctions;

import ai.whylabs.core.structures.SegmentStatistic;
import ai.whylabs.core.structures.SegmentStatisticGrouped;
import ai.whylabs.core.structures.SirenDigestPayload;
import java.util.ArrayList;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.val;
import org.apache.spark.api.java.function.MapFunction;

@AllArgsConstructor
public class SegmentStatisticGroupedToSirenDigestPayload
    implements MapFunction<SegmentStatisticGrouped, SirenDigestPayload> {

  private String runId;

  @Override
  public SirenDigestPayload call(SegmentStatisticGrouped grouped) throws Exception {
    List<SegmentStatistic> segmentStatistics = new ArrayList();
    for (int x = 0; x < grouped.getColumns().size(); x++) {

      val c =
          SegmentStatistic.builder()
              .segment(grouped.getSegments().get(x))
              .numAnomalies(grouped.getNumAnomalies().get(x))
              .columns(grouped.getColumns().get(x))
              .earliestAnomalyDatasetTimestamp(grouped.getEarliestAnomalyDatasetTimestamp())
              .oldestAnomalyDatasetTimestamp(grouped.getOldestAnomalyDatasetTimestamp())
              .analyzerType(grouped.getAnalyzerType().get(x))
              .build();
      segmentStatistics.add(c);
    }
    val s =
        SirenDigestPayload.builder()
            .orgId(grouped.getOrgId())
            .monitorId(grouped.getMonitorId())
            .datasetId(grouped.getDatasetId())
            .runId(runId)
            .segmentStatistics(segmentStatistics);

    return s.build();
  }
}
