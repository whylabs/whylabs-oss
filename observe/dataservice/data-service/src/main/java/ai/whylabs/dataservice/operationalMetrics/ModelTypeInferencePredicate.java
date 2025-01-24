package ai.whylabs.dataservice.operationalMetrics;

import ai.whylabs.core.enums.ModelType;
import java.util.function.Predicate;

public interface ModelTypeInferencePredicate extends Predicate<String> {
  public ModelType getType();
}
