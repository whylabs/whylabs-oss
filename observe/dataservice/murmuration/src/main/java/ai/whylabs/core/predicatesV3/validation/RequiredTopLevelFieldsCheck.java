package ai.whylabs.core.predicatesV3.validation;

import ai.whylabs.core.configV3.structure.MonitorConfigV3;
import ai.whylabs.core.structures.monitor.events.FailureType;

public class RequiredTopLevelFieldsCheck extends MonitorConfigTopLevelCheck {

  @Override
  public boolean test(MonitorConfigV3 monitorConfigV3) {
    if (monitorConfigV3.getGranularity() == null) {
      failureType = FailureType.ConfigMissingRequiredField;
      internalErrorMessage = "Missing granularity";
      return false;
    }
    if (monitorConfigV3.getOrgId() == null) {
      failureType = FailureType.ConfigMissingRequiredField;
      internalErrorMessage = "Missing orgId";
      return false;
    }
    if (monitorConfigV3.getDatasetId() == null) {
      failureType = FailureType.ConfigMissingRequiredField;
      internalErrorMessage = "Missing datasetId";
      return false;
    }

    return true;
  }
}
