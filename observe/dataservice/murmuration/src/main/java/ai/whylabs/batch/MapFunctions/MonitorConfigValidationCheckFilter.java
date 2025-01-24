package ai.whylabs.batch.MapFunctions;

import ai.whylabs.core.configV3.structure.MonitorConfigV3Row;
import ai.whylabs.core.serde.MonitorConfigV3JsonSerde;
import ai.whylabs.core.validation.MonitorConfigValidationCheck;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.Iterator;
import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import org.apache.spark.api.java.function.FlatMapFunction;

@Slf4j
@AllArgsConstructor
public class MonitorConfigValidationCheckFilter extends MonitorConfigValidationCheck
    implements FlatMapFunction<MonitorConfigV3Row, MonitorConfigV3Row> {

  protected ZonedDateTime currentTime;

  @Override
  public Iterator<MonitorConfigV3Row> call(MonitorConfigV3Row monitorConfigV3Row) throws Exception {

    try {
      val config = clean(MonitorConfigV3JsonSerde.parseMonitorConfigV3(monitorConfigV3Row));
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
}
