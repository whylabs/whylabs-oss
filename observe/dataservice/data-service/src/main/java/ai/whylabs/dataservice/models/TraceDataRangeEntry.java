package ai.whylabs.dataservice.models;

import lombok.Builder;
import lombok.Value;

@Builder
@Value
public class TraceDataRangeEntry {
  String resourceId;
  Long minStartTime;
  Long maxStartTime;
}
