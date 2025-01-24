package ai.whylabs.dataservice.responses;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class TimeBoundaryResponseRow {

  private Long start;
  private Long end;
  private String datasetId;
}
