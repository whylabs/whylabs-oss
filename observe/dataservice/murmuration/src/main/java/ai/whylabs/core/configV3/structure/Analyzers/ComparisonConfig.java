package ai.whylabs.core.configV3.structure.Analyzers;

import ai.whylabs.core.calculationsV3.BaseCalculationV3;
import ai.whylabs.core.calculationsV3.EqualityCalculationDouble;
import ai.whylabs.core.calculationsV3.EqualityCalculationLong;
import ai.whylabs.core.calculationsV3.EqualityCalculationString;
import ai.whylabs.core.configV3.structure.Analyzer;
import ai.whylabs.core.configV3.structure.Baselines.Baseline;
import ai.whylabs.core.configV3.structure.MonitorConfigV3;
import ai.whylabs.core.configV3.structure.enums.AnalysisMetric;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonInclude.Include;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldNameConstants;
import lombok.extern.slf4j.Slf4j;
import lombok.val;

@FieldNameConstants
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Slf4j
public class ComparisonConfig implements AnalyzerConfig {
  public static final String type = "comparison";

  private Integer version;
  private ExpectedValue expected;

  // oneOf [TrailingWindowBaseline, ReferenceProfileId, TimeRangeBaseline, SingleBatchBaseline]
  @JsonInclude(Include.NON_NULL)
  private Baseline baseline;

  private String metric;
  private String operator;

  @Override
  public BaseCalculationV3 toCalculation(
      MonitorConfigV3 monitorConfigV3, boolean overwriteEvents, Analyzer analyzer) {

    val type = AnalysisMetric.getExtractorOutputType(AnalysisMetric.fromName(analyzer.getMetric()));
    if (type != null) {
      if (type.equals(Long.class)) {
        return new EqualityCalculationLong(monitorConfigV3, analyzer, overwriteEvents, this);
      } else if (type.equals(Double.class)) {
        return new EqualityCalculationDouble(monitorConfigV3, analyzer, overwriteEvents, this);
      } else if (type.equals(String.class)) {
        return new EqualityCalculationString(monitorConfigV3, analyzer, overwriteEvents, this);
      }
    }
    log.error(
        "ComparisonConfig unimplemented analyzer metric \"%s\" in %s/%s",
        analyzer.getMetric(), monitorConfigV3.getOrgId(), monitorConfigV3.getDatasetId());

    return null;
  }

  @Override
  public String getAnalyzerType() {
    return type;
  }
}
