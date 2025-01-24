package ai.whylabs.dataservice.responses;

import java.util.Set;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Builder
@Data
@AllArgsConstructor
@NoArgsConstructor
public class EvaluateTargetMatrixResponse {
  private Set<String> segments;
  private Set<String> columns;
}
