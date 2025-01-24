package ai.whylabs.dataservice.adhoc;

import ai.whylabs.dataservice.enums.AsyncAnalysisQueue;
import ai.whylabs.dataservice.enums.FailureType;
import java.util.List;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class AsyncRequest {
  private Long id;
  private String orgId;
  private String datasetId;
  private StatusEnum status;
  private DestinationEnum destination;

  @Deprecated // Reserved word in PG makes this a tough one to query
  private String interval;
  private Long createdTimestamp;
  private Long updatedTimestamp;
  private String runId;

  // Json array of analyzer configs
  private String analyzersConfigs;

  // How many columns we still need to run. Determined after planning phase.
  private Long tasks;
  private Long tasksComplete;
  private String backfillInterval;

  protected Boolean enableDatasetLevelAnalysis = false;

  // How many features/segments are part of this
  private Long features;
  private Long segments;

  private List<String> columns;

  // Scope the request down to a specific segment
  private String segmentList;
  private boolean includeOverallSegment = true;

  private Long eligableToRun;
  private Long numAttempts = 0l;
  private String analyzerId;
  private AsyncAnalysisQueue queue = AsyncAnalysisQueue.on_demand;
  private FailureType failureType;

  private Long anomalies;
  private String analyzerType;
  private String monitorId;
}
