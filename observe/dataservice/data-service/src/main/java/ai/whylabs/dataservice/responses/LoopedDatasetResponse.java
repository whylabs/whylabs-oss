package ai.whylabs.dataservice.responses;

import java.util.List;
import lombok.Builder;
import lombok.Data;

@Builder
@Data
public class LoopedDatasetResponse {
  private List<LoopeddataResponseRow> rows;
}
