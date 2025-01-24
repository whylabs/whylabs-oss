package ai.whylabs.dataservice.responses;

import lombok.Builder;
import lombok.Data;

@Builder
@Data
public class CountAnalyzerRunResult {
  private Long count;
}
