package ai.whylabs.core.configV3.structure.Analyzers;

import ai.whylabs.core.calculationsV3.BaseCalculationV3;
import ai.whylabs.core.calculationsV3.FixedThresholdCalculationDouble;
import ai.whylabs.core.calculationsV3.FixedThresholdCalculationLong;
import ai.whylabs.core.configV3.structure.Analyzer;
import ai.whylabs.core.configV3.structure.MonitorConfigV3;
import ai.whylabs.core.configV3.structure.enums.AnalysisMetric;
import com.fasterxml.jackson.annotation.JsonAlias;
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
public class FixedThresholdsConfig implements AnalyzerConfig {
  public static final String type = "fixed";

  private Integer version;

  @JsonInclude(Include.NON_NULL)
  private String metric;

  private Double upper;
  private Double lower;

  @JsonAlias("nConsecutive")
  private Long nConsecutive;

  @Override
  public BaseCalculationV3 toCalculation(
      MonitorConfigV3 monitorConfigV3, boolean overwriteEvents, Analyzer analyzer) {

    val type = AnalysisMetric.getExtractorOutputType(AnalysisMetric.fromName(analyzer.getMetric()));
    if (type != null) {
      if (type.equals(Long.class)) {
        return new FixedThresholdCalculationLong(monitorConfigV3, analyzer, overwriteEvents, this);
      } else if (type.equals(Double.class)) {
        return new FixedThresholdCalculationDouble(
            monitorConfigV3, analyzer, overwriteEvents, this);
      }
    }
    log.error(
        "FixedThresholdsConfig unimplemented analyzer metric {} {} {}",
        analyzer.getMetric(),
        monitorConfigV3.getOrgId(),
        monitorConfigV3.getDatasetId());

    return null;
  }

  @Override
  public String getAnalyzerType() {
    return type;
  }
}
