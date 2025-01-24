package ai.whylabs.dataservice.diagnostics.checks;

import ai.whylabs.dataservice.diagnostics.DiagnosticContext;
import ai.whylabs.dataservice.diagnostics.enums.GeneralObservation;
import ai.whylabs.dataservice.diagnostics.output.DiagnosticOutput;
import java.util.List;

public class CheckAnalyzerRemovedAfterAnalysis implements Check {
  @Override
  public void check(DiagnosticContext c, List<DiagnosticOutput> out) {
    if (c.getConfigLatest() == null || c.getAnalyzer(c.getConfigLatest()) == null) {

      out.add(
          new DiagnosticOutput(
              GeneralObservation.ANALYZER_REMOVED_AFTER_ANALYSIS,
              "Analyzer "
                  + c.getAnalysis().getAnalyzerId()
                  + " has since been removed from the monitor config",
              SuccessEnum.FAIL));
    } else {
      out.add(
          new DiagnosticOutput(
              GeneralObservation.ANALYZER_REMOVED_AFTER_ANALYSIS,
              "Analyzer is still around",
              SuccessEnum.PASS));
    }
  }
}
