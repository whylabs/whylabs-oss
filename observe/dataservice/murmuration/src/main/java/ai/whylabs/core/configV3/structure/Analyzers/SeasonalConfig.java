package ai.whylabs.core.configV3.structure.Analyzers;

import ai.whylabs.core.calculationsV3.BaseCalculationV3;
import ai.whylabs.core.calculationsV3.SeasonalCalculation;
import ai.whylabs.core.configV3.structure.Analyzer;
import ai.whylabs.core.configV3.structure.Baselines.TrailingWindowBaseline;
import ai.whylabs.core.configV3.structure.MonitorConfigV3;
import ai.whylabs.core.configV3.structure.TimeRange;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonSetter;
import com.fasterxml.jackson.annotation.Nulls;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldNameConstants;

@FieldNameConstants
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class SeasonalConfig implements AnalyzerConfig {
  public static final String type = "seasonal";
  private Integer schemaVersion; // optional

  // pass in arbitrary string parameters to calculation
  @JsonSetter(nulls = Nulls.SKIP)
  @Builder.Default
  private Map<String, String> params = Collections.emptyMap(); // optional

  private String metric; // required

  @JsonSetter(nulls = Nulls.SKIP)
  @Builder.Default
  private Double maxUpperThreshold = Double.POSITIVE_INFINITY;

  @JsonSetter(nulls = Nulls.SKIP)
  @Builder.Default
  private Double minLowerThreshold = Double.NEGATIVE_INFINITY;

  @JsonSetter(nulls = Nulls.SKIP)
  @Builder.Default
  private SeasonalAlgorithm algorithm = SeasonalAlgorithm.arima; // optional

  @JsonSetter(nulls = Nulls.SKIP)
  @Builder.Default
  private Double alpha = 0.05D; // optional significance level for the confidence interval

  @JsonSetter(nulls = Nulls.SKIP)
  @Builder.Default
  private List<TimeRange> stddevTimeRanges = Collections.emptyList(); // optional

  @JsonSetter(nulls = Nulls.SKIP)
  @Builder.Default
  private Integer stddevMaxBatchSize =
      30; // optional Maximum number of data points to consider for calculating

  // stddev.

  @JsonSetter(nulls = Nulls.SKIP)
  @Builder.Default
  private Double stddevFactor =
      1.0; // optional  multiplier factor for calculating upper bounds and lower bounds

  @JsonSetter(nulls = Nulls.SKIP)
  @Builder.Default
  private Integer minBatchSize = 1; // optional

  // support for uni-directional threshold-cased configs.  If unset, alert if above upper- or below
  // lower-threshold.
  // Otherwise, alert only if exceeding indicated threshold.
  @JsonInclude(JsonInclude.Include.NON_NULL)
  private ThresholdType thresholdType;

  private TrailingWindowBaseline baseline; // required

  @Override
  public BaseCalculationV3 toCalculation(
      MonitorConfigV3 monitorConfigV3, boolean overwriteEvents, Analyzer analyzer) {
    return new SeasonalCalculation(monitorConfigV3, analyzer, overwriteEvents, this);
  }

  @Override
  public Integer getVersion() {
    return null;
  }

  @Override
  public String getAnalyzerType() {
    return type;
  }
}
