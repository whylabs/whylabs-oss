package ai.whylabs.core.configV3.structure.Analyzers;

import ai.whylabs.core.calculationsV3.BaseCalculationV3;
import ai.whylabs.core.calculationsV3.StddevCalculation;
import ai.whylabs.core.configV3.structure.Analyzer;
import ai.whylabs.core.configV3.structure.Baselines.Baseline;
import ai.whylabs.core.configV3.structure.MonitorConfigV3;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonSetter;
import com.fasterxml.jackson.annotation.Nulls;
import java.util.Collections;
import java.util.Map;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldNameConstants;

@FieldNameConstants
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StddevConfig implements AnalyzerConfig {
  public static final String type = "stddev";
  private Integer version;
  private String metric;

  // pass in arbitrary string parameters to calculation
  @JsonSetter(nulls = Nulls.SKIP)
  @Builder.Default
  private Map<String, String> params = Collections.emptyMap(); // optional

  @JsonSetter(nulls = Nulls.SKIP)
  @Builder.Default
  private Double maxUpperThreshold = Double.POSITIVE_INFINITY;

  @JsonSetter(nulls = Nulls.SKIP)
  @Builder.Default
  private Double minLowerThreshold = Double.NEGATIVE_INFINITY;

  @JsonSetter(nulls = Nulls.SKIP)
  @Builder.Default
  private Double factor = 3.0D;

  // support for uni-directional threshold-cased configs.  If unset, alert if above upper- or below
  // lower-threshold.
  // Otherwise, alert only if exceeding indicated threshold.
  @JsonInclude(JsonInclude.Include.NON_NULL)
  private ThresholdType thresholdType;

  @JsonInclude(JsonInclude.Include.NON_NULL)
  private ConditionalLimitType limitType = ConditionalLimitType.disjunction;

  @JsonSetter(nulls = Nulls.SKIP)
  @Builder.Default
  private Integer minBatchSize = 3;

  // Any type of baseline is acceptable. stddev will assume poisson distribution in the case of a
  // single-batch baseline.
  private Baseline baseline;

  @Override
  public BaseCalculationV3 toCalculation(
      MonitorConfigV3 monitorConfigV3, boolean overwriteEvents, Analyzer analyzer) {
    return new StddevCalculation(monitorConfigV3, analyzer, overwriteEvents, this);
  }

  @Override
  public String getAnalyzerType() {
    return type;
  }

  // Convenience functions so tests and validators still work.
  public Double getMaxUpper() {
    return maxUpperThreshold;
  }

  public Double getMinLower() {
    return minLowerThreshold;
  }
}
