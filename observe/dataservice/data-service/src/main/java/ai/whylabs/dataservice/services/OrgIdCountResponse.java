package ai.whylabs.dataservice.services;

import java.util.List;
import javax.persistence.ElementCollection;
import lombok.Builder;
import lombok.Data;

/** Response for counting the number of rows per org and that percentage of the total. */
@Data
@Builder
public class OrgIdCountResponse {

  @Builder
  @Data
  public static class OrgIdCountRow {
    public String orgId;
    public int count;
    public float percent;
  }

  @ElementCollection public List<OrgIdCountRow> orgIdAndCount;
}
