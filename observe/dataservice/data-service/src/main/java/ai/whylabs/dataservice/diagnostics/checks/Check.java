package ai.whylabs.dataservice.diagnostics.checks;

import ai.whylabs.dataservice.diagnostics.DiagnosticContext;
import ai.whylabs.dataservice.diagnostics.output.DiagnosticOutput;
import java.util.List;

public interface Check {
  void check(DiagnosticContext c, List<DiagnosticOutput> out);
}
