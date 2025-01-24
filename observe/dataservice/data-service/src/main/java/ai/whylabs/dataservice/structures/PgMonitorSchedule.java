package ai.whylabs.dataservice.structures;

import ai.whylabs.core.enums.ExtendedChronoUnit;
import ai.whylabs.dataservice.adhoc.StatusEnum;
import java.time.ZonedDateTime;
import lombok.Builder;
import lombok.Data;

/**
 * Each analyzer gets a single "schedule" row which is updated each time it queues up a run in the
 * adhoc_async_requests table. That's your 1->many relationship.
 */
@Data
@Builder
public class PgMonitorSchedule {
  private Long id;
  private String orgId;
  private String datasetId;
  private ZonedDateTime targetBucket;
  private ZonedDateTime eligableToRun;
  private String analyzerId;
  private String backfillInterval;
  private String analyzerConfig;
  private StatusEnum lastStatus;
  private ZonedDateTime lastUpdated;
  private ExtendedChronoUnit granularity;
  private String analyzerType;
  private String monitorId;
}
