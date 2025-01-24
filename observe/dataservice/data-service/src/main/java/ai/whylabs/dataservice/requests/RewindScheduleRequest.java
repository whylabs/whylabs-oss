package ai.whylabs.dataservice.requests;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class RewindScheduleRequest {
  private String orgId;
  private String datasetId;
  private String timestamp;
}
