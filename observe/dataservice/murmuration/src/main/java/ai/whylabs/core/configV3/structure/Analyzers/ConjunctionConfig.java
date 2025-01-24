package ai.whylabs.core.configV3.structure.Analyzers;

import ai.whylabs.core.calculationsV3.*;
import ai.whylabs.core.calculationsV3.results.ConjunctionCalculationResult;
import ai.whylabs.core.configV3.structure.Analyzer;
import ai.whylabs.core.configV3.structure.MonitorConfigV3;
import ai.whylabs.core.structures.monitor.events.AnalyzerResult;
import java.util.List;
import lombok.*;
import lombok.experimental.FieldNameConstants;

@FieldNameConstants
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class ConjunctionConfig implements AnalyzerConfig, ParentAnalyzerConfig {
  public static final String type = "conjunction";

  private List<String> analyzerIds;

  @Override
  public BaseCalculationV3 toCalculation(
      MonitorConfigV3 monitorConfigV3, boolean overwriteEvents, Analyzer analyzer) {

    return new ConjunctionCalculation(monitorConfigV3, analyzer, overwriteEvents, this);
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

  public boolean generateParentAnalysis(MonitorConfigV3 monitorConfigV3, AnalyzerResult child) {
    if (!analyzerIds.contains(child.getAnalyzerId())) {
      return false;
    }
    for (val a : monitorConfigV3.getAnalyzers()) {
      // Only the first child in the list produces the parent. Else we'd have duplicates
      if (analyzerIds.contains(child.getAnalyzerId())) {
        return a.getId().equals(child.getAnalyzerId());
      }
    }
    return false;
  }

  public boolean isChild(AnalyzerResult child) {
    if (getAnalyzerIds().contains(child.getAnalyzerId())) {
      return true;
    }
    return false;
  }

  @Override
  public String getAnalyzerResultType() {
    return ConjunctionCalculationResult.class.getSimpleName();
  }
}
