package ai.whylabs.batch.MapFunctions;

import ai.whylabs.core.configV3.structure.DigestMode;
import ai.whylabs.core.configV3.structure.MonitorConfigV3Row;
import ai.whylabs.core.serde.MonitorConfigV3JsonSerde;
import ai.whylabs.core.structures.MonitorDigest;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.val;
import org.apache.spark.api.java.function.FlatMapFunction;

/** Extract active digests scheduled to run now from the monitor configs */
@AllArgsConstructor
public class MonitorConfigRowToDigests
    implements FlatMapFunction<MonitorConfigV3Row, MonitorDigest> {
  ZonedDateTime currentTime;

  @Override
  public Iterator<MonitorDigest> call(MonitorConfigV3Row monitorConfigV3Row) throws Exception {
    List<MonitorDigest> monitorDigests = new ArrayList();
    val conf = MonitorConfigV3JsonSerde.parseMonitorConfigV3(monitorConfigV3Row);
    for (val monitor : conf.getMonitors()) {
      if (monitor.getDisabled() != null && monitor.getDisabled()) {
        continue;
      }
      if (!monitor.getMode().getClass().equals(DigestMode.class)) {
        continue;
      }
      if (!monitor.getSchedule().isMatch(currentTime)) {
        continue;
      }

      // Note we pass around monitor as json b/c otherwise actions have polymorphism which doesn't
      // work with spark structures
      monitorDigests.add(
          MonitorDigest.builder()
              .monitorJson(MonitorConfigV3JsonSerde.toJson(monitor))
              .analyzerIds(monitor.getAnalyzerIds())
              .orgId(conf.getOrgId())
              .datasetId(conf.getDatasetId())
              .severity(monitor.getSeverity())
              .monitorId(monitor.getId())
              .build());
    }
    return monitorDigests.iterator();
  }
}
