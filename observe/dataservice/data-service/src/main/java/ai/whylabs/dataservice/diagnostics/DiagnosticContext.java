package ai.whylabs.dataservice.diagnostics;

import ai.whylabs.core.configV3.structure.Analyzer;
import ai.whylabs.core.configV3.structure.MonitorConfigV3;
import ai.whylabs.core.structures.monitor.events.AnalyzerResultResponse;
import java.util.List;
import lombok.Builder;
import lombok.Data;
import lombok.val;

@Data
@Builder
public class DiagnosticContext {
  // Note any of these can be null except the analysis so perform null checks accordingly in your
  // checks
  private AnalyzerResultResponse analysis;
  private MonitorConfigV3 configLatest;
  private MonitorConfigV3 configAtTimeOfAnalysis;
  private Long mostRecentTimestampUploadedForBaseline;
  private Long mostRecentTimestampUploadedForTarget;
  private List<String> baselineSegments;
  private List<String> targetSegments;

  public Analyzer getAnalyzer(MonitorConfigV3 conf) {
    if (conf == null || conf.getAnalyzers() == null) {
      return null;
    }
    for (val a : conf.getAnalyzers()) {
      if (a.getId() != null && a.getId().equals(analysis.getAnalyzerId())) {
        return a;
      }
    }
    return null;
  }
}
