package ai.whylabs.dataservice.responses;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ConfusionResponse {
  private String[] labels;
  private String target_field;
  private String prediction_field;
  private String score_field;
  private long[][] counts;
}
