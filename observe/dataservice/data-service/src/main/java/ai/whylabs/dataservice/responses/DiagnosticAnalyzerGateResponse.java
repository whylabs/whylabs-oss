package ai.whylabs.dataservice.responses;

import ai.whylabs.dataservice.diagnostics.output.AnalyzerGateAnalysisOutput;
import ai.whylabs.dataservice.structures.UploadPattern;
import java.util.List;
import lombok.Data;

@Data
public class DiagnosticAnalyzerGateResponse {
  private UploadPattern uploadPattern;
  private List<AnalyzerGateAnalysisOutput> dataReadinessDurationChecks;
  private List<AnalyzerGateAnalysisOutput> batchCooldownPeriodChecks;
}
