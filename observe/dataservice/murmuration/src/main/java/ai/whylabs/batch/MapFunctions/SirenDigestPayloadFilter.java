package ai.whylabs.batch.MapFunctions;

import ai.whylabs.core.configV3.structure.Monitor;
import ai.whylabs.core.predicatesV3.inclusion.AnomalyFilterSirenDigestPredicate;
import ai.whylabs.core.serde.MonitorConfigV3JsonSerde;
import ai.whylabs.core.structures.MonitorDigest;
import ai.whylabs.core.structures.SirenDigestPayload;
import java.util.Arrays;
import java.util.Collections;
import java.util.Iterator;
import lombok.val;
import org.apache.spark.api.java.function.FlatMapFunction;
import scala.Tuple2;

public class SirenDigestPayloadFilter
    implements FlatMapFunction<Tuple2<SirenDigestPayload, MonitorDigest>, SirenDigestPayload> {

  @Override
  public Iterator<SirenDigestPayload> call(
      Tuple2<SirenDigestPayload, MonitorDigest> sirenDigestPayloadMonitorDigestTuple2)
      throws Exception {
    val digest = sirenDigestPayloadMonitorDigestTuple2._2();
    val sirenDigest = sirenDigestPayloadMonitorDigestTuple2._1();
    Monitor monitor = MonitorConfigV3JsonSerde.parseMonitor(digest.getMonitorJson());

    if (new AnomalyFilterSirenDigestPredicate()
        .test(sirenDigest, monitor.getMode().getAnomalyFilter())) {
      return Arrays.asList(sirenDigest).iterator();
    }

    return Collections.emptyIterator();
  }
}
