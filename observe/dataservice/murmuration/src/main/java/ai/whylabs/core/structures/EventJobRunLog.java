package ai.whylabs.core.structures;

import java.io.Serializable;
import java.time.temporal.ChronoUnit;
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
public class EventJobRunLog implements Serializable {
  private long jobRanTimeStamp;
  private long targetBatchHourlyTimeStamp;
  private long jobRuntimeMillis;
  private long numEventsGenerated;
  // TODO: private String computeClusterId;
  private List<ChronoUnit> granularitiesRan;
  private String orgId;
  private String datasetId;
  private Boolean overwriteEvents;
}
