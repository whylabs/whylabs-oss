package ai.whylabs.batch.MapFunctions;

import ai.whylabs.core.configV3.structure.Monitor;
import ai.whylabs.core.configV3.structure.MonitorConfigV3;
import ai.whylabs.core.configV3.structure.MonitorConfigV3Row;
import ai.whylabs.core.serde.MonitorConfigV3JsonSerde;
import com.google.common.cache.Cache;
import com.google.common.cache.CacheBuilder;
import java.io.Serializable;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import lombok.val;
import org.apache.spark.api.java.function.FlatMapFunction;

public class ExplodeMonitorConfigV3IntoMonitors
    implements FlatMapFunction<MonitorConfigV3Row, Monitor>, Serializable {

  private Cache<String, MonitorConfigV3> MONITOR_CONFIG_CACHE;

  public ExplodeMonitorConfigV3IntoMonitors() {
    this.MONITOR_CONFIG_CACHE = CacheBuilder.newBuilder().maximumSize(1000).build();
  }

  @Override
  public Iterator<Monitor> call(MonitorConfigV3Row row) throws Exception {
    val monitorConfigV3 = MonitorConfigV3JsonSerde.parseMonitorConfigV3(MONITOR_CONFIG_CACHE, row);
    List<Monitor> monitors = new ArrayList();
    for (val m : monitorConfigV3.getMonitors()) {
      if (m.getDisabled()) {
        continue;
      }
      monitors.add(m);
    }

    return monitors.iterator();
  }
}
