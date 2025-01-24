package ai.whylabs.dataservice.responses;

import java.time.ZonedDateTime;
import lombok.Builder;
import lombok.Data;

@Builder
@Data
public class ColumnStat {
  private ZonedDateTime earliestIngestTimestamp;
  private ZonedDateTime earliestDatasetTimestamp;
  private ZonedDateTime greatestDatasetTimestamp;
  private Long uploadLagP50m;
  private Long uploadLagP95m;
  private Long uploadLagP99m;
}
