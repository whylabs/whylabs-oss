package ai.whylabs.dataservice.diagnostics.checks;

import ai.whylabs.core.configV3.structure.enums.DataType;
import ai.whylabs.dataservice.diagnostics.DiagnosticContext;
import ai.whylabs.dataservice.diagnostics.enums.GeneralObservation;
import ai.whylabs.dataservice.diagnostics.output.DiagnosticOutput;
import java.util.List;

public class CheckTypeChange implements Check {
  @Override
  public void check(DiagnosticContext c, List<DiagnosticOutput> out) {
    if (c.getConfigLatest() == null || c.getConfigAtTimeOfAnalysis() == null) {
      // you need both the newest and oldest monitor configs to do this check
      return;
    }

    DataType timeOfDataType = null;
    DataType currentDataType = null;
    if (c.getConfigLatest().getEntitySchema() != null
        && c.getConfigLatest().getEntitySchema().getColumns() != null
        && c.getConfigLatest().getEntitySchema().getColumns().get(c.getAnalysis().getColumn())
            != null) {
      currentDataType =
          c.getConfigLatest()
              .getEntitySchema()
              .getColumns()
              .get(c.getAnalysis().getColumn())
              .getDataType();
    }
    if (c.getConfigAtTimeOfAnalysis().getEntitySchema() != null
        && c.getConfigAtTimeOfAnalysis().getEntitySchema().getColumns() != null
        && c.getConfigAtTimeOfAnalysis()
                .getEntitySchema()
                .getColumns()
                .get(c.getAnalysis().getColumn())
            != null) {
      timeOfDataType =
          c.getConfigAtTimeOfAnalysis()
              .getEntitySchema()
              .getColumns()
              .get(c.getAnalysis().getColumn())
              .getDataType();
    }
    if (timeOfDataType != null
        && currentDataType != null
        && !currentDataType.equals(timeOfDataType)) {
      out.add(
          new DiagnosticOutput(
              GeneralObservation.SCHEMA_CHANGE,
              "Entity schema was "
                  + timeOfDataType
                  + " at the time analysis was ran, but it has since been updated to "
                  + currentDataType,
              SuccessEnum.FAIL));
    } else if (timeOfDataType != null && currentDataType == null) {
      out.add(
          new DiagnosticOutput(
              GeneralObservation.SCHEMA_CHANGE,
              "Entity schema at the time of analysis was "
                  + timeOfDataType
                  + " but this column has since been removed from the schema",
              SuccessEnum.FAIL));
    } else {
      out.add(
          new DiagnosticOutput(
              GeneralObservation.SCHEMA_CHANGE,
              "Entity schema the same today as it was at the time of analysis: " + timeOfDataType,
              SuccessEnum.PASS));
    }
  }
}
