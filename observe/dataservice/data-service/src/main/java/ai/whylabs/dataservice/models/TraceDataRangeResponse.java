package ai.whylabs.dataservice.models;

import lombok.Builder;
import lombok.Value;

@Builder
@Value
public class TraceDataRangeResponse {
  String orgId;
  String resourceId;
  Boolean hasTraceData;
  Long minStartTime;
  Long maxStartTime;
}
