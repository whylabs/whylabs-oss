package ai.whylabs.dataservice.responses;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;
import lombok.Data;

@Data
public class DiagnosticAnalyzersResponse {
  @Schema(required = true)
  List<DiagnosticAnalyzerAnomalyRecord> noisyAnalyzers;

  @Schema(required = true)
  List<DiagnosticAnalyzerFailedRecord> failedAnalyzers;
}
