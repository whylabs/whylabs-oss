package ai.whylabs.dataservice.metrics.result;

import java.util.List;
import lombok.*;

@Builder
@Data
@AllArgsConstructor
@NoArgsConstructor
public class DataEvaluationResponse {
  @Singular List<DataEvaluationResult> entries;
}
