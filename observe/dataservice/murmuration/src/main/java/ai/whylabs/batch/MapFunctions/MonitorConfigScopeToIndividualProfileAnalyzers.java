package ai.whylabs.batch.MapFunctions;

import ai.whylabs.core.configV3.structure.Analyzer;
import ai.whylabs.core.configV3.structure.MonitorConfigV3Row;
import ai.whylabs.core.serde.MonitorConfigV3JsonSerde;
import java.util.*;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import org.apache.spark.api.java.function.FlatMapFunction;

/**
 * Generally we would run all analyzers but we have a special case with individual profile analysis.
 * That data can get pretty bulky and we don't want to read it every hour on the main flow. Too
 * expensive. So what we do instead take the individual profile data as its being written to the
 * deltalake and analyze it as its being written. You loose the automatic backfill for individual
 * profile analyzers, but it keeps the pipeline cost effective. This class filters down the monitor
 * configs with such analyzers and down to just the individual profile analyzers within.
 */
@Slf4j
public class MonitorConfigScopeToIndividualProfileAnalyzers
    implements FlatMapFunction<MonitorConfigV3Row, MonitorConfigV3Row> {
  @Override
  public Iterator<MonitorConfigV3Row> call(MonitorConfigV3Row monitorConfigV3Row) throws Exception {
    try {
      val conf = MonitorConfigV3JsonSerde.parseMonitorConfigV3(monitorConfigV3Row);
      if (conf == null || conf.getAnalyzers() == null || conf.getAnalyzers().size() < 1) {
        return Collections.emptyIterator();
      }
      List<Analyzer> individualProfileAnalyzers = new ArrayList<>();
      for (val a : conf.getAnalyzers()) {
        if (a.isDisableTargetRollup()) {
          individualProfileAnalyzers.add(a);
        }
      }
      if (individualProfileAnalyzers.size() == 0) {
        return Collections.emptyIterator();
      }
      conf.setAnalyzers(individualProfileAnalyzers);
      return Arrays.asList(MonitorConfigV3JsonSerde.toMonitorConfigV3Row(conf)).iterator();
    } catch (Exception e) {
      log.error("Error parsing config {}", monitorConfigV3Row, e);
      return Collections.emptyIterator();
    }
  }
}
