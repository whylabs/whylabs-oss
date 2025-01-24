package ai.whylabs.core.structures;

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
public class SegmentStatisticGrouped {
  private String orgId;
  private String datasetId;
  private String monitorId;
  private List<List<String>> columns;
  private List<String> segments;
  private List<Long> numAnomalies;
  private List<String> analyzerType;
  private Long oldestAnomalyDatasetTimestamp;
  private Long earliestAnomalyDatasetTimestamp;
}
