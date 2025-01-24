package ai.whylabs.dataservice.diagnostics.checks;

import ai.whylabs.core.configV3.structure.Analyzer;
import ai.whylabs.dataservice.diagnostics.DiagnosticContext;
import ai.whylabs.dataservice.diagnostics.enums.GeneralObservation;
import ai.whylabs.dataservice.diagnostics.output.DiagnosticOutput;
import java.util.List;

public class CheckAnalyzerConfigUpdatedAfterAnalysis implements Check {

  @Override
  public void check(DiagnosticContext c, List<DiagnosticOutput> out) {
    Analyzer latestAnalyzerConfig = c.getAnalyzer(c.getConfigLatest());
    Analyzer timeOfAnalyzerConfig = c.getAnalyzer(c.getConfigAtTimeOfAnalysis());

    if (latestAnalyzerConfig != null && timeOfAnalyzerConfig != null) {
      if (latestAnalyzerConfig.toString().equals(timeOfAnalyzerConfig.toString())) {
        // TODO: Validate that toString is a fair comparison
        out.add(
            new DiagnosticOutput(
                GeneralObservation.ANALYZER_CONFIGURATION_UPDATED_AFTER_ANALYSIS,
                "Analyzer config has changed",
                SuccessEnum.FAIL));
      } else {
        out.add(
            new DiagnosticOutput(
                GeneralObservation.ANALYZER_CONFIGURATION_UPDATED_AFTER_ANALYSIS,
                "Analyzer configuration is the same as it was at the time of analysis",
                SuccessEnum.PASS));
      }
    }
  }
}
