package ai.whylabs.core.factories;

import ai.whylabs.core.calculationsV3.BaseCalculationV3;
import ai.whylabs.core.configV3.structure.Analyzer;
import ai.whylabs.core.configV3.structure.MonitorConfigV3;
import java.io.Serializable;

public class CalculationFactory implements Serializable {

  public BaseCalculationV3 toCalculation(
      Analyzer analyzer, MonitorConfigV3 monitorConfig, Boolean jobLevelOverwriteFlag) {
    return analyzer.getConfig().toCalculation(monitorConfig, jobLevelOverwriteFlag, analyzer);
  }
}
