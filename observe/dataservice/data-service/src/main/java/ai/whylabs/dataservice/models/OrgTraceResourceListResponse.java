package ai.whylabs.dataservice.models;

import java.util.List;
import lombok.Builder;
import lombok.Singular;
import lombok.Value;

@Builder
@Value
public class OrgTraceResourceListResponse {
  @Singular List<TraceDataRangeEntry> entries;
}
