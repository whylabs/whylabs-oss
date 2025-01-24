package ai.whylabs.core.structures.monitor.events.calculationOutput;

import com.fasterxml.jackson.annotation.JsonPropertyDescription;
import javax.persistence.Embeddable;
import lombok.Data;

@Embeddable
@Data
public class ComparisonContainer {
  @JsonPropertyDescription("Baseline value if comparing against baseline in an equality monitor")
  private String comparison_expected;

  @JsonPropertyDescription("Target value in an equality monitor")
  private String comparison_observed;
}
