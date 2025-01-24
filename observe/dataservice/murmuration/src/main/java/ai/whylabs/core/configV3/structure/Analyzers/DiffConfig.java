package ai.whylabs.core.configV3.structure.Analyzers;

import ai.whylabs.core.calculationsV3.BaseCalculationV3;
import ai.whylabs.core.calculationsV3.DiffCalculation;
import ai.whylabs.core.configV3.structure.Analyzer;
import ai.whylabs.core.configV3.structure.Baselines.Baseline;
import ai.whylabs.core.configV3.structure.Baselines.ReferenceProfileId;
import ai.whylabs.core.configV3.structure.Baselines.SingleBatchBaseline;
import ai.whylabs.core.configV3.structure.Baselines.TimeRangeBaseline;
import ai.whylabs.core.configV3.structure.Baselines.TrailingWindowBaseline;
import ai.whylabs.core.configV3.structure.MonitorConfigV3;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonInclude.Include;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.text.MessageFormat;
import java.util.Arrays;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Builder.Default;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldNameConstants;
import lombok.val;

@FieldNameConstants
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class DiffConfig implements AnalyzerConfig {
  public static final String type = "diff";
  private Integer version;

  @JsonInclude(Include.NON_NULL)
  private String metric;

  @Default() private DiffMode mode = DiffMode.abs;
  private Double threshold; // minimum threshold that will trigger an anomaly.

  @JsonInclude(Include.NON_NULL)
  private ThresholdType thresholdType;

  @JsonInclude(Include.NON_NULL)
  private Baseline baseline;

  // baseline may be oneOf [TrailingWindowBaseline, ReferenceProfileId, TimeRangeBaseline,
  // SingleBatchBaseline]
  @JsonProperty("baseline")
  public DiffConfig setBaseline(Baseline baseline) {
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

  @Override
  public BaseCalculationV3 toCalculation(
      MonitorConfigV3 monitorConfigV3, boolean overwriteEvents, Analyzer analyzer) {
    return new DiffCalculation(monitorConfigV3, analyzer, overwriteEvents, this);
  }

  @Override
  public String getAnalyzerType() {
    return type;
  }

  public Integer getMinBatchSize() {
    return 1;
  }
}
