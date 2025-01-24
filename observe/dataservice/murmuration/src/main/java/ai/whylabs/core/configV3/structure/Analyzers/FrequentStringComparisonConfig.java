package ai.whylabs.core.configV3.structure.Analyzers;

import ai.whylabs.core.calculationsV3.*;
import ai.whylabs.core.configV3.structure.Analyzer;
import ai.whylabs.core.configV3.structure.Baselines.Baseline;
import ai.whylabs.core.configV3.structure.MonitorConfigV3;
import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class FrequentStringComparisonConfig implements AnalyzerConfig {
  public static final String type = "frequent_string_comparison";
  private Integer version;

  private FrequentStringComparisonOperator operator;

  @JsonInclude(JsonInclude.Include.NON_NULL)
  private String metric;

  @Override
  public BaseCalculationV3 toCalculation(
      MonitorConfigV3 monitorConfigV3, boolean overwriteEvents, Analyzer analyzer) {

    return new FrequentStringComparison(monitorConfigV3, analyzer, overwriteEvents, this);
  }

  @JsonInclude(JsonInclude.Include.NON_NULL)
  private Baseline baseline;

  @Override
  public String getAnalyzerType() {
    return type;
  }
}
