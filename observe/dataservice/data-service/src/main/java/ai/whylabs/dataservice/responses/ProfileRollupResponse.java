package ai.whylabs.dataservice.responses;

import java.util.List;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ProfileRollupResponse {
  private String orgId;

  private Long startingTimestamp;

  private Long endingTimestamp;

  private List<ProfileRollupResponseRow> rows;
}
