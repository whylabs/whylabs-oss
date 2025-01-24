package ai.whylabs.core.configV3.structure.Analyzers;

import ai.whylabs.core.calculationsV3.BaseCalculationV3;
import ai.whylabs.core.calculationsV3.ContinuousDriftCalculation;
import ai.whylabs.core.calculationsV3.DiscreteDriftCalculation;
import ai.whylabs.core.configV3.structure.Analyzer;
import ai.whylabs.core.configV3.structure.Baselines.Baseline;
import ai.whylabs.core.configV3.structure.Baselines.ReferenceProfileId;
import ai.whylabs.core.configV3.structure.Baselines.SingleBatchBaseline;
import ai.whylabs.core.configV3.structure.Baselines.TimeRangeBaseline;
import ai.whylabs.core.configV3.structure.Baselines.TrailingWindowBaseline;
import ai.whylabs.core.configV3.structure.MonitorConfigV3;
import ai.whylabs.core.configV3.structure.enums.AnalysisMetric;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonInclude.Include;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonSetter;
import com.fasterxml.jackson.annotation.Nulls;
import java.text.MessageFormat;
import java.util.Arrays;
import java.util.Collections;
import java.util.Map;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldNameConstants;
import lombok.val;

@FieldNameConstants
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class DriftConfig implements AnalyzerConfig {

  public enum Algorithm implements AnalyzerConfig.Algorithm {
    hellinger,
    ks_test,
    kl_divergence,
    variation_distance,
    jensenshannon,
    psi
  }

  public static final String type = "drift";
  private Integer version;

  // pass in arbitrary string parameters to calculation
  @JsonSetter(nulls = Nulls.SKIP)
  @Builder.Default
  private Map<String, String> params = Collections.emptyMap(); // optional

  @JsonInclude(Include.NON_NULL)
  private String metric; // histogram, frequent_items

  @JsonSetter(nulls = Nulls.SKIP)
  @Builder.Default
  private Algorithm algorithm = Algorithm.hellinger;

  private Double threshold; // used for greater than or less than comparison.

  @JsonSetter(nulls = Nulls.SKIP)
  @Builder.Default
  private Integer minBatchSize = 1;

  @JsonInclude(Include.NON_NULL)
  private Baseline baseline;

  // baseline may be oneOf [TrailingWindowBaseline, ReferenceProfileId, TimeRangeBaseline,
  // SingleBatchBaseline]
  @JsonProperty("baseline")
  public DriftConfig setBaseline(Baseline baseline) {
    val allowed =
        Arrays.asList(
            TrailingWindowBaseline.class,
            ReferenceProfileId.class,
            TimeRangeBaseline.class,
            SingleBatchBaseline.class);
    if (allowed.contains(baseline.getClass())) {
      this.baseline = baseline;
      return this;
    }
    throw new RuntimeException(
        MessageFormat.format(
            "baseline type {0} is inappropriate for {1}",
            baseline.getClass().getName(), this.getClass().getName()));
  }

  // metric may be oneOf [histogram, frequent_items]
  @JsonProperty("metric")
  public DriftConfig setMetric(String metric) {
    val allowed =
        Arrays.asList(AnalysisMetric.histogram.name(), AnalysisMetric.frequent_items.name());
    if (allowed.contains(metric)) {
      this.metric = metric;
      return this;
    }
    throw new RuntimeException(
        MessageFormat.format(
            "metric type {0} is inappropriate for {1}", metric, this.getClass().getName()));
  }

  @Override
  public BaseCalculationV3 toCalculation(
      MonitorConfigV3 monitorConfigV3, boolean overwriteEvents, Analyzer analyzer) {

    // NB we are ALWAYS doing hellinger distance, regardless of any other settings in the config.
    // At the root of both Discrete and Continuous drift calculation is hellinger distance. The only
    // difference between the two is whether they use the KllFloats sketch (histogram) or the
    // FrequentItems
    // sketch.
    switch (AnalysisMetric.fromName(metric)) {
      case frequent_items:
        return new DiscreteDriftCalculation(monitorConfigV3, analyzer, overwriteEvents, this);
      case histogram:
        return new ContinuousDriftCalculation(monitorConfigV3, analyzer, overwriteEvents, this);
      default:
        return null;
    }
  }

  @Override
  @JsonIgnore
  public String getAnalyzerType() {
    return type;
  }

  @Override
  @JsonIgnore
  public String getAlgorithmMode() {
    return metric;
  }
}
