package ai.whylabs.dataservice.diagnostics.output;

import java.util.List;
import lombok.Data;

@Data
public class CorrelatedAlerts {
  private List<String> alertingSegments;
}
