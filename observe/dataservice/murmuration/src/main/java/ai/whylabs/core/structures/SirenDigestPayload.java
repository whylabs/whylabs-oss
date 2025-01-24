package ai.whylabs.core.structures;

import ai.whylabs.core.structures.monitor.events.AnalyzerResult;
import java.io.Serializable;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldNameConstants;

@FieldNameConstants
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
/**
 * This pojo models the payloads engine sends to siren via SQS. Changes must be coordinated across
 * teams with BE.
 */
public class SirenDigestPayload implements Serializable {
  public static String DIGEST = "DIGEST";
  private String id;
  private String orgId;
  private String datasetId;
  private Long numAnomalies;
  private String monitorId;
  private Integer severity;
  private String mode;
  private List<SegmentStatistic> segmentStatistics;
  private List<ColumnStatistic> columnStatistics;
  private Long oldestAnomalyDatasetTimestamp;
  private Long earliestAnomalyDatasetTimestamp;
  private String runId;
  private List<AnalyzerResult> anomalySample;
  private Double totalWeight;
}
