package ai.whylabs.core.structures.monitor.events.calculationOutput;

import ai.whylabs.core.configV3.structure.Analyzers.DiffMode;
import com.fasterxml.jackson.annotation.JsonPropertyDescription;
import javax.persistence.Column;
import javax.persistence.Embeddable;
import javax.persistence.EnumType;
import javax.persistence.Enumerated;
import lombok.Data;
import org.hibernate.annotations.Type;

@Embeddable
@Data
public class DiffContainer {
  @JsonPropertyDescription("How much difference?")
  private Double diff_metricValue;

  @JsonPropertyDescription("Anomaly threshold")
  private Double diff_threshold;

  @JsonPropertyDescription("Mode (pct/absolute)")
  @Enumerated(EnumType.STRING)
  @Column(columnDefinition = "diff_mode")
  @Type(type = "diff_mode_enum")
  private DiffMode diff_mode;
}
