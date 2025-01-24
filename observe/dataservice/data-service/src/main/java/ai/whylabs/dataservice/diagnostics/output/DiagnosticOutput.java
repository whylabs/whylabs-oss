package ai.whylabs.dataservice.diagnostics.output;

import ai.whylabs.dataservice.diagnostics.checks.SuccessEnum;
import ai.whylabs.dataservice.diagnostics.enums.GeneralObservation;
import io.micronaut.core.annotation.Introspected;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Introspected
@AllArgsConstructor
@NoArgsConstructor
public class DiagnosticOutput {
  private GeneralObservation observation;
  private String observationText;
  private SuccessEnum status;
}
