package ai.whylabs.core.predicatesV3.inclusion;

import ai.whylabs.core.configV3.structure.Analyzer;
import ai.whylabs.core.configV3.structure.ColumnSchema;
import ai.whylabs.core.configV3.structure.enums.Classifier;
import ai.whylabs.core.configV3.structure.enums.DiscretenessType;
import ai.whylabs.core.configV3.structure.enums.TargetLevel;
import ai.whylabs.druid.whylogs.column.DatasetMetrics;

/** Is this feature enabled on this monitor config? */
public class FeaturePredicate {
  private static final String WILDCARD = "*";
  private static final String DISCRETE_GROUP = "group:discrete";
  private static final String CONTINUOUS_GROUP = "group:continuous";
  private static final String INPUT_GROUP = "group:input";
  private static final String OUTPUT_GROUP = "group:output";
  private static final String MIN_WEIGHT_PREFIX = "weight>";

  public boolean test(Analyzer analyzer, ColumnSchema schema, String feature, Double weight) {
    if (analyzer.getLevel().equals(TargetLevel.dataset)) {
      return feature == null || feature.startsWith(DatasetMetrics.INTERNAL_PREFIX);
    }
    if (analyzer.getTarget().getAllowedColumns() == null
        || analyzer.getTarget().getAllowedColumns().size() == 0) {
      return false;
    }

    boolean enabled = false;
    for (String allowedExpression : analyzer.getTarget().getAllowedColumns()) {
      if (match(allowedExpression, schema, feature, weight)) {
        enabled = true;
        break;
      }
    }
    if (!enabled) {
      return false;
    }
    if (analyzer.getTarget().getBlockedColumns() != null) {
      for (String blockExpression : analyzer.getTarget().getBlockedColumns()) {
        if (match(blockExpression, schema, feature, weight)) {
          return false;
        }
      }
    }

    return true;
  }

  boolean match(String target, ColumnSchema schema, String feature, Double weight) {
    if (target.equals(WILDCARD)) {
      return true;
    }
    if (target.equals(feature)) {
      return true;
    }

    if (weight != null
        && target.startsWith(MIN_WEIGHT_PREFIX)
        && target.length() > MIN_WEIGHT_PREFIX.length()) {
      // TODO: Add some real expression support
      Double targetWeight = new Double(target.substring(MIN_WEIGHT_PREFIX.length()));
      if (targetWeight <= weight) {
        return true;
      }
    }

    if (schema != null
        && target.equals(INPUT_GROUP)
        && schema.getClassifier() != null
        && schema.getClassifier().equals(Classifier.input)) {
      return true;
    }
    if (schema != null
        && target.equals(OUTPUT_GROUP)
        && schema.getClassifier() != null
        && schema.getClassifier().equals(Classifier.output)) {
      return true;
    }

    if (schema != null
        && target.equals(DISCRETE_GROUP)
        && schema.getDiscreteness() != null
        && schema.getDiscreteness().equals(DiscretenessType.discrete)) {
      return true;
    }
    if (schema != null
        && target.equals(CONTINUOUS_GROUP)
        && schema.getDiscreteness() != null
        && schema.getDiscreteness().equals(DiscretenessType.continuous)) {
      return true;
    }

    return false;
  }
}
