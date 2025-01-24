package ai.whylabs.core.configV3.structure.Analyzers;

import static ai.whylabs.core.configV3.structure.Analyzers.ColumnListChangeMode.ON_ADD_AND_REMOVE;

import ai.whylabs.core.calculationsV3.BaseCalculationV3;
import ai.whylabs.core.calculationsV3.SchemaChangeCalculation;
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
import com.fasterxml.jackson.annotation.JsonSetter;
import com.fasterxml.jackson.annotation.Nulls;
import java.text.MessageFormat;
import java.util.Arrays;
import java.util.List;
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
public class ColumnListChangeConfig implements AnalyzerConfig {
  public static final String type = "column_list";
  private Integer version;

  @JsonInclude(Include.NON_NULL)
  private String metric;

  @JsonSetter(nulls = Nulls.SKIP)
  @Builder.Default
  private ColumnListChangeMode mode = ON_ADD_AND_REMOVE;

  private List<String> exclude;

  @JsonInclude(Include.NON_NULL)
  private Baseline baseline;

  // baseline may be oneOf [TrailingWindowBaseline, ReferenceProfileId, TimeRangeBaseline,
  // SingleBatchBaseline]
  @JsonProperty("baseline")
  public ColumnListChangeConfig setBaseline(Baseline baseline) {
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
    // Detects changes to list of features in a model.
    // Valid modes: ON_ADD_AND_REMOVE, ON_ADD, ON_REMOVE

    return new SchemaChangeCalculation(monitorConfigV3, analyzer, overwriteEvents, this);
  }

  @Override
  public String getAnalyzerType() {
    return type;
  }
}
