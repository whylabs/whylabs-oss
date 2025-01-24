package ai.whylabs.dataservice.responses;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldNameConstants;

@FieldNameConstants
@Builder
@Data
@AllArgsConstructor
@NoArgsConstructor
public class SegmentedGetAlertsOverTimeResponse {
  private Map<String, List<GetAlertsOverTimeResponse>> results = new HashMap<>();
}
