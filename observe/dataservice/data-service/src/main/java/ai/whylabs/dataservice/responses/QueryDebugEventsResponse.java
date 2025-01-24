package ai.whylabs.dataservice.responses;

import ai.whylabs.dataservice.structures.DebugEvent;
import java.util.List;
import lombok.Builder;
import lombok.Data;

@Builder
@Data
public class QueryDebugEventsResponse {
  List<DebugEvent> events;
  Integer nextOffset;
  Boolean isTruncated;
}
