package ai.whylabs.core.configV3.structure.Analyzers;

import ai.whylabs.core.calculationsV3.BaseCalculationV3;
import ai.whylabs.core.calculationsV3.DisjunctionCalculation;
import ai.whylabs.core.calculationsV3.results.DisjunctionCalculationResult;
import ai.whylabs.core.configV3.structure.Analyzer;
import ai.whylabs.core.configV3.structure.MonitorConfigV3;
import ai.whylabs.core.structures.monitor.events.AnalyzerResult;
import java.util.List;
import lombok.*;
import lombok.experimental.FieldNameConstants;
import lombok.extern.slf4j.Slf4j;

@FieldNameConstants
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Slf4j
public class DisjunctionConfig implements AnalyzerConfig, ParentAnalyzerConfig {
  public static final String type = "disjunction";

  private List<String> analyzerIds;

  @Override
  public BaseCalculationV3 toCalculation(
      MonitorConfigV3 monitorConfigV3, boolean overwriteEvents, Analyzer analyzer) {

    return new DisjunctionCalculation(monitorConfigV3, analyzer, overwriteEvents, this);
  }

  @Override
  public Integer getVersion() {
    return null;
  }

  @Override
  public String getAnalyzerType() {
    return type;
  }

  @Override
  public String getMetric() {
    return null;
  }

  public Boolean parent() {
    return Boolean.TRUE;
  }

  public boolean isChild(AnalyzerResult child) {
    if (getAnalyzerIds().contains(child.getAnalyzerId())) {
      return true;
    }
    return false;
  }

  @Override
  public String getAnalyzerResultType() {
    return DisjunctionCalculationResult.class.getSimpleName();
  }
}
