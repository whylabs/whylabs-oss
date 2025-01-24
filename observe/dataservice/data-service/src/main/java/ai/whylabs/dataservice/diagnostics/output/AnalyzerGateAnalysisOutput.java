package ai.whylabs.dataservice.diagnostics.output;

import ai.whylabs.dataservice.diagnostics.enums.AnalyzerGateObservation;
import ai.whylabs.dataservice.diagnostics.enums.GateType;
import io.micronaut.core.annotation.Introspected;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Introspected
@AllArgsConstructor
@NoArgsConstructor
public class AnalyzerGateAnalysisOutput {
  private AnalyzerGateObservation observation;
  private String analyzerId;
  private String datasetId;
  private String current;
  private String suggested;
  private GateType gateType;
  private String description;
}
