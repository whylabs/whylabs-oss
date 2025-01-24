package ai.whylabs.dataservice.responses;

import ai.whylabs.core.configV3.structure.Analyzer;
import ai.whylabs.core.structures.monitor.events.AnalyzerResultResponse;
import ai.whylabs.dataservice.diagnostics.output.CorrelatedAlerts;
import ai.whylabs.dataservice.diagnostics.output.DiagnosticOutput;
import java.util.List;
import lombok.Data;

@Data
public class DiagnosticResponse {
  private String analysisRan;
  private String datasetTimestamp;
  private CorrelatedAlerts correlatedAlerts;
  private List<DiagnosticOutput> diagnostics;
  private Analyzer analyzerConfigTimeOfAnalysis;
  private Analyzer analyzerConfigLatest;
  private AnalyzerResultResponse analysis;
}
