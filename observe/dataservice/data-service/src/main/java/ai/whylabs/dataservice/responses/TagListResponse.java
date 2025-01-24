package ai.whylabs.dataservice.responses;

import java.util.Map;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class TagListResponse {
  Map<String, String[]> results;
}
