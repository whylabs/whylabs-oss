package ai.whylabs.dataservice.diagnostics;

import ai.whylabs.dataservice.diagnostics.checks.*;
import ai.whylabs.dataservice.diagnostics.output.DiagnosticOutput;
import java.util.ArrayList;
import java.util.List;
import lombok.AllArgsConstructor;

@AllArgsConstructor
public class DiagnosticRunner {
  private DiagnosticContext c;

  public List<DiagnosticOutput> get() {
    List<DiagnosticOutput> out = new ArrayList<>();
    new CheckAnalyzerRemovedAfterAnalysis().check(c, out);
    new CheckAnalyzerConfigUpdatedAfterAnalysis().check(c, out);
    new CheckBaselineLateDataArrival().check(c, out);
    new CheckTargetLateDataArrival().check(c, out);
    new CheckTypeChange().check(c, out);
    new CheckSegmentedDrift().check(c, out);
    new CheckDiscretenessChange().check(c, out);

    return out;
  }
}
