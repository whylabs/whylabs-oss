package ai.whylabs.core.configV3.structure.Analyzers;

import ai.whylabs.core.calculationsV3.*;
import ai.whylabs.core.configV3.structure.Analyzer;
import ai.whylabs.core.configV3.structure.MonitorConfigV3;
import ai.whylabs.core.configV3.structure.enums.AnalysisMetric;
import ai.whylabs.core.configV3.structure.enums.MonotonicDirection;
import lombok.*;
import lombok.experimental.FieldNameConstants;
import lombok.extern.slf4j.Slf4j;

@FieldNameConstants
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Slf4j
public class MonotonicCalculationConfig implements AnalyzerConfig {
  public static final String type = "monotonic";
  public MonotonicDirection direction;
  private String metric;
  private Long numBuckets = 1l;

  @Override
  public BaseCalculationV3 toCalculation(
      MonitorConfigV3 monitorConfigV3, boolean overwriteEvents, Analyzer analyzer) {
    val type = AnalysisMetric.getExtractorOutputType(AnalysisMetric.fromName(analyzer.getMetric()));
    if (type != null) {
      if (type.equals(Long.class)) {
        return new MonotonicCalculationLong(monitorConfigV3, analyzer, overwriteEvents, this);
      } else if (type.equals(Double.class)) {
        return new MonotonicCalculationDouble(monitorConfigV3, analyzer, overwriteEvents, this);
      }
    }
    log.error(
        "MonotonicCalculationConfig unimplemented analyzer metric \"%s\" in %s/%s",
        analyzer.getMetric(), monitorConfigV3.getOrgId(), monitorConfigV3.getDatasetId());

    return null;
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
