package ai.whylabs.core.configV3.structure.Analyzers;

import ai.whylabs.core.calculationsV3.BaseCalculationV3;
import ai.whylabs.core.configV3.structure.Analyzer;
import ai.whylabs.core.configV3.structure.Baselines.Baseline;
import ai.whylabs.core.configV3.structure.MonitorConfigV3;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonSubTypes;
import com.fasterxml.jackson.annotation.JsonTypeInfo;

@JsonIgnoreProperties(ignoreUnknown = true)
@JsonTypeInfo(use = JsonTypeInfo.Id.NAME, property = "type")
@JsonSubTypes({
  @JsonSubTypes.Type(value = DiffConfig.class, name = DiffConfig.type),
  @JsonSubTypes.Type(value = ComparisonConfig.class, name = ComparisonConfig.type),
  @JsonSubTypes.Type(value = ListComparisonConfig.class, name = ListComparisonConfig.type),
  @JsonSubTypes.Type(
      value = FrequentStringComparisonConfig.class,
      name = FrequentStringComparisonConfig.type),
  @JsonSubTypes.Type(value = ColumnListChangeConfig.class, name = ColumnListChangeConfig.type),
  @JsonSubTypes.Type(value = FixedThresholdsConfig.class, name = FixedThresholdsConfig.type),
  @JsonSubTypes.Type(value = ConjunctionConfig.class, name = ConjunctionConfig.type),
  @JsonSubTypes.Type(value = DisjunctionConfig.class, name = DisjunctionConfig.type),
  @JsonSubTypes.Type(value = StddevConfig.class, name = StddevConfig.type),
  @JsonSubTypes.Type(value = DriftConfig.class, name = DriftConfig.type),
  @JsonSubTypes.Type(value = SeasonalConfig.class, name = SeasonalConfig.type),
  @JsonSubTypes.Type(value = ExperimentalConfig.class, name = ExperimentalConfig.type),
  @JsonSubTypes.Type(
      value = MonotonicCalculationConfig.class,
      name = MonotonicCalculationConfig.type),
})
public interface AnalyzerConfig {
  public interface Algorithm {
    String name();
  }

  BaseCalculationV3 toCalculation(
      MonitorConfigV3 monitorConfigV3, boolean overwriteEvents, Analyzer analyzer);

  Integer getVersion();

  default Algorithm getAlgorithm() {
    return null;
  }
  ;

  String getAnalyzerType();

  default String getAlgorithmMode() {
    return null;
  }

  default Baseline getBaseline() {
    return null;
  }

  // default is to rollup the baseline, but individual configs may override
  default Boolean rollUp() {
    return Boolean.TRUE;
  }

  // default is to require at least three baseline datapoints, but individual configs may override
  default Integer getMinBatchSize() {
    return 3;
  }

  String getMetric();

  // Analyzers like conjunction can have a parent/child relationship
  default Boolean parent() {
    return Boolean.FALSE;
  }
}
