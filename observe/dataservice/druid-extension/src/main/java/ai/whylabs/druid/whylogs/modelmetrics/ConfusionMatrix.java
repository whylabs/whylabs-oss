package ai.whylabs.druid.whylogs.modelmetrics;

import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Value;

@Value
@AllArgsConstructor
public class ConfusionMatrix {
  private final List<String> labels;
  private final String target_field;
  private final String predictions_field;
  private final String score_field;
  private final long[][] counts;
}
