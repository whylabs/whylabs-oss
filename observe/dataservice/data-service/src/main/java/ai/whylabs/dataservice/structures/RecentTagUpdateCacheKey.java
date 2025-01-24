package ai.whylabs.dataservice.structures;

import lombok.Builder;
import lombok.EqualsAndHashCode;

@Builder
@EqualsAndHashCode
public class RecentTagUpdateCacheKey {
  private String orgId;
  private String datasetId;
  private String key;
  private String value;
}
