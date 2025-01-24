package ai.whylabs.core.validation;

import ai.whylabs.core.configV3.structure.Analyzer;
import ai.whylabs.core.configV3.structure.MonitorConfigV3;
import ai.whylabs.core.predicatesV3.validation.AnalyzerCheck;
import ai.whylabs.core.predicatesV3.validation.MonitorConfigTopLevelCheck;
import ai.whylabs.core.predicatesV3.validation.RequiredTopLevelFieldsCheck;
import ai.whylabs.core.predicatesV3.validation.ValidAnalyzerMetric;
import ai.whylabs.core.predicatesV3.validation.ValidAnalyzerSchedule;
import ai.whylabs.core.predicatesV3.validation.ValidAnalyzerThreshold;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import lombok.NoArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import lombok.val;

@NoArgsConstructor
@Slf4j
public class MonitorConfigValidationCheck {

  /**
   * Clean up the monitor config ridding it of any disabled or improperly configured analyzers
   *
   * @param config
   * @return
   */
  public MonitorConfigV3 clean(MonitorConfigV3 config) {
    List<Analyzer> goodAnalyzers = new ArrayList<>();
    val monitorLevelChecks = getOverallChecks();
    val analyzerChecks = getAanalyzerChecks();
    for (val m : monitorLevelChecks) {
      if (!m.test(config)) {
        log.info("Invalid monitor config {}, check {}", config, m);
        return null;
      }
    }

    Set<String> analyzerIds = new HashSet<>();
    for (val a : getActiveAnalyzers(config)) {
      int success = 0;
      for (val c : analyzerChecks) {
        if (c.test(a)) {
          success++;
        } else {
          log.info("Invalid analyzer {}, check {}", a, c);
        }
      }
      if (success == analyzerChecks.size() && !analyzerIds.contains(a.getId())) {
        goodAnalyzers.add(a);
        analyzerIds.add(a.getId());
      }
    }
    config.setAnalyzers(goodAnalyzers);
    return config;
  }

  protected List<Analyzer> getActiveAnalyzers(MonitorConfigV3 config) {

    List<Analyzer> activeAnalyzers = new ArrayList<>();
    for (Analyzer a : config.getAnalyzers()) {
      if ((a.getDisabled() == null || !a.getDisabled())) {
        activeAnalyzers.add(a);
      }
    }
    return activeAnalyzers;
  }

  protected List<AnalyzerCheck> getAanalyzerChecks() {
    return Arrays.asList(
        new ValidAnalyzerMetric(), new ValidAnalyzerThreshold(), new ValidAnalyzerSchedule());
  }

  protected List<MonitorConfigTopLevelCheck> getOverallChecks() {
    return Arrays.asList(new RequiredTopLevelFieldsCheck());
  }
}
