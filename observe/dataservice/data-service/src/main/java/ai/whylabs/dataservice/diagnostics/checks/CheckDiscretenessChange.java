package ai.whylabs.dataservice.diagnostics.checks;

import ai.whylabs.core.configV3.structure.enums.DiscretenessType;
import ai.whylabs.dataservice.diagnostics.DiagnosticContext;
import ai.whylabs.dataservice.diagnostics.enums.GeneralObservation;
import ai.whylabs.dataservice.diagnostics.output.DiagnosticOutput;
import java.util.List;

public class CheckDiscretenessChange implements Check {
  @Override
  public void check(DiagnosticContext c, List<DiagnosticOutput> out) {
    if (c.getConfigLatest() == null || c.getConfigAtTimeOfAnalysis() == null) {
      // you need both the newest and oldest monitor configs to do this check
      return;
    }

    DiscretenessType timeOfDiscreteness = null;
    DiscretenessType currentDiscreteness = null;
    if (c.getConfigLatest().getEntitySchema() != null
        && c.getConfigLatest().getEntitySchema().getColumns() != null
        && c.getConfigLatest().getEntitySchema().getColumns().get(c.getAnalysis().getColumn())
            != null) {
      currentDiscreteness =
          c.getConfigLatest()
              .getEntitySchema()
              .getColumns()
              .get(c.getAnalysis().getColumn())
              .getDiscreteness();
    }
    if (c.getConfigAtTimeOfAnalysis().getEntitySchema() != null
        && c.getConfigAtTimeOfAnalysis().getEntitySchema().getColumns() != null
        && c.getConfigAtTimeOfAnalysis()
                .getEntitySchema()
                .getColumns()
                .get(c.getAnalysis().getColumn())
            != null) {
      timeOfDiscreteness =
          c.getConfigAtTimeOfAnalysis()
              .getEntitySchema()
              .getColumns()
              .get(c.getAnalysis().getColumn())
              .getDiscreteness();
    }
    if (timeOfDiscreteness != null
        && currentDiscreteness != null
        && !currentDiscreteness.equals(timeOfDiscreteness)) {
      out.add(
          new DiagnosticOutput(
              GeneralObservation.DISCRETENESS_CHANGE,
              "Entity schema was "
                  + timeOfDiscreteness
                  + " at the time analysis was ran, but it has since been updated to "
                  + currentDiscreteness,
              SuccessEnum.FAIL));
    } else if (timeOfDiscreteness != null && currentDiscreteness == null) {
      out.add(
          new DiagnosticOutput(
              GeneralObservation.DISCRETENESS_CHANGE,
              "Entity schema at the time of analysis was "
                  + timeOfDiscreteness
                  + " but this column has since been removed from the schema",
              SuccessEnum.FAIL));
    } else {
      out.add(
          new DiagnosticOutput(
              GeneralObservation.DISCRETENESS_CHANGE,
              "Entity schema the same today as it was at the time of analysis: "
                  + timeOfDiscreteness,
              SuccessEnum.PASS));
    }
  }
}
