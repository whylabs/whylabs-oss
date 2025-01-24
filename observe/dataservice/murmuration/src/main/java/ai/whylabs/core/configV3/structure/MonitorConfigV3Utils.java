package ai.whylabs.core.configV3.structure;

import ai.whylabs.core.aggregation.AggregationKey;
import ai.whylabs.core.aggregation.BaselineRoller;
import ai.whylabs.core.configV3.structure.Analyzers.ParentAnalyzerConfig;
import ai.whylabs.core.configV3.structure.Baselines.Baseline;
import ai.whylabs.core.configV3.structure.enums.Classifier;
import ai.whylabs.core.configV3.structure.enums.DiscretenessType;
import ai.whylabs.core.configV3.structure.enums.TargetLevel;
import ai.whylabs.core.predicatesV3.inclusion.FeaturePredicate;
import ai.whylabs.core.structures.QueryResultStructure;
import ai.whylabs.druid.whylogs.column.DatasetProfileMessageWrapper;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import lombok.val;
import org.apache.commons.lang3.StringUtils;

public class MonitorConfigV3Utils {

  public static List<Baseline> getBaselineConfigs(MonitorConfigV3 config) {
    List<Baseline> configs = new ArrayList();
    for (val c : config.getAnalyzers()) {
      configs.add(c.getBaseline());
    }
    return configs;
  }

  public static Set<AggregationKey> getUniqueAggregations(
      MonitorConfigV3 config, String columnName) {
    val featurePredicate = new FeaturePredicate();
    Set<AggregationKey> aggregations = new HashSet();
    if (config != null && config.getAnalyzers() != null) {
      for (val c : config.getAnalyzers()) {
        if (c.getConfig() != null && c.getConfig() instanceof ParentAnalyzerConfig) {
          continue;
        }
        if (config.getEntitySchema() == null
            || config.getEntitySchema().getColumns() == null
            || !config.getEntitySchema().getColumns().containsKey(columnName)
            || c.getTargetMatrix().getLevel().equals(TargetLevel.dataset)
            || featurePredicate.test(
                c, config.getEntitySchema().getColumns().get(columnName), columnName, 1.0)) {
          aggregations.add(
              AggregationKey.builder()
                  .baseline(c.getBaseline())
                  .targetLevel(c.getTargetMatrix().getLevel())
                  .targetSize(c.getTargetSize())
                  .targetProfileId(c.getTargetMatrix().getProfileId())
                  .disableTargetRollup(c.isDisableTargetRollup())
                  .build());
        }
      }
    }
    return aggregations;
  }

  public static Set<Baseline> getUniqueBaselineConfigs(MonitorConfigV3 config) {
    Set<Baseline> configs = new HashSet();
    if (config != null && config.getAnalyzers() != null) {
      for (val c : config.getAnalyzers()) {
        configs.add(c.getBaseline());
      }
    }
    return configs;
  }

  public static ColumnSchema getSchemaIfPresent(MonitorConfigV3 config, String feature) {
    if (config.getEntitySchema() != null && config.getEntitySchema().getColumns() != null) {
      return config.getEntitySchema().getColumns().get(feature);
    }
    return null;
  }

  /**
   * TODO: Consider removing this method once we have a solid flow around entitySchema. It exists
   * because we need group:discrete, group:continous, group:input, group:output targeting ahead of
   * the entity schema flow being ready.
   */
  public static ColumnSchema getSchemaWithInferredBackup(
      MonitorConfigV3 config,
      String feature,
      QueryResultStructure target,
      BaselineRoller baselineRoller) {

    val schema = getSchemaIfPresent(config, feature);
    if (schema != null) {
      if (schema.getDiscreteness() == null) {
        schema.setDiscreteness(getDiscreteFallback(target, baselineRoller));
      }
      if (schema.getClassifier() == null) {
        schema.setClassifier(getClassifier(feature));
      }
      return schema;
    }
    return ColumnSchema.builder()
        .discreteness(getDiscreteFallback(target, baselineRoller))
        .classifier(getClassifier(feature))
        .build();
  }

  private static DiscretenessType getDiscreteFallback(
      QueryResultStructure target, BaselineRoller baselineRoller) {
    if (baselineRoller != null && baselineRoller.hasBaseline()) {
      // Preference to infer from baseline to make things more stable (less flip flopping)
      return getDiscrete(baselineRoller.get());
    } else {
      return getDiscrete(target);
    }
  }

  /** Entity Schema isn't in place yet so we have the option to fall back to what we aggregated */
  private static DiscretenessType getDiscrete(QueryResultStructure target) {
    if (target == null || target.getDiscrete() == null) {
      return null;
    }

    if (target.getDiscrete()) {
      return DiscretenessType.discrete;
    } else {
      return DiscretenessType.continuous;
    }
  }

  /** Entity Schema isn't in place yet so we have the option to fall back to what we aggregated */
  private static Classifier getClassifier(String feature) {
    if (StringUtils.containsIgnoreCase(
        feature, DatasetProfileMessageWrapper.OUTPUT_KEYWORD_CONST)) {
      return Classifier.output;
    }
    return Classifier.input;
  }
}
