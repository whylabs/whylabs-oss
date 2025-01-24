package ai.whylabs.dataservice.operationalMetrics;

import ai.whylabs.core.enums.ModelType;

public class ClassificationModelPredicate implements ModelTypeInferencePredicate {
  private static final String PREFIX = "model/classification";

  @Override
  public boolean test(String metricPath) {
    if (metricPath.startsWith(PREFIX)) {
      return true;
    }

    return false;
  }

  @Override
  public ModelType getType() {
    return ModelType.classification;
  }
}
