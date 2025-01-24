package ai.whylabs.dataservice.structures;

import java.util.List;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ProfileIngestionStats {
  private String orgId;
  private String datasetId;
  private String traceId;
  private long datasetTimestamp;
  private int numMetrics;
  private List<String> segmentTags;
  private Long profileId;
}
