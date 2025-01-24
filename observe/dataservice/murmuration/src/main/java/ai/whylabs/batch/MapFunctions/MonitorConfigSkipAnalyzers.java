package ai.whylabs.batch.MapFunctions;

import ai.whylabs.core.configV3.structure.Analyzer;
import ai.whylabs.core.configV3.structure.MonitorConfigV3;
import ai.whylabs.core.configV3.structure.MonitorConfigV3Row;
import ai.whylabs.core.serde.MonitorConfigV3JsonSerde;
import ai.whylabs.core.validation.MonitorConfigValidationCheck;
import java.util.*;
import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import org.apache.spark.api.java.function.FlatMapFunction;

@Slf4j
@AllArgsConstructor
public class MonitorConfigSkipAnalyzers extends MonitorConfigValidationCheck
    implements FlatMapFunction<MonitorConfigV3Row, MonitorConfigV3Row> {

  protected String skipType;

  @Override
  public Iterator<MonitorConfigV3Row> call(MonitorConfigV3Row monitorConfigV3Row) throws Exception {

    try {
      val config = skipAnalyzers(MonitorConfigV3JsonSerde.parseMonitorConfigV3(monitorConfigV3Row));
      if (config == null) {
        // Monitor config is totally busted
        return Collections.emptyIterator();
      }
      monitorConfigV3Row.setJsonConf(MonitorConfigV3JsonSerde.toString(config));
      return Arrays.asList(monitorConfigV3Row).iterator();
    } catch (Exception e) {
      log.info("Skipping {} due to {}", monitorConfigV3Row, e);
      return new ArrayList<MonitorConfigV3Row>().iterator();
    }
  }

  /**
   * Clean up the monitor config ridding it of any disabled or improperly configured analyzers
   *
   * @param config
   * @return
   */
  public MonitorConfigV3 skipAnalyzers(MonitorConfigV3 config) {
    List<Analyzer> goodAnalyzers = new ArrayList<>();
    for (val a : getActiveAnalyzers(config)) {
      if (a.getConfig().getAnalyzerType().equalsIgnoreCase(skipType)) {
        log.info("Skip analyzer {}", a);
        continue;
      }
      goodAnalyzers.add(a);
    }
    config.setAnalyzers(goodAnalyzers);
    return config;
  }
}
