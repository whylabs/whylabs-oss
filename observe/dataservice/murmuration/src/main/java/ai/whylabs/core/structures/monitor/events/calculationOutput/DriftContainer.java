package ai.whylabs.core.structures.monitor.events.calculationOutput;

import com.fasterxml.jackson.annotation.JsonPropertyDescription;
import javax.persistence.Embeddable;
import lombok.Data;

@Embeddable
@Data
public class DriftContainer {
  @JsonPropertyDescription("How much drift?")
  private Double drift_metricValue;

  @JsonPropertyDescription("Anomaly threshold?")
  private Double drift_threshold;
}
