package ai.whylabs.dataservice.responses;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class LoopeddataResponseRow {
  public String orgId;
  public String datasetId;
  public long bucket;
  public long window;
}
