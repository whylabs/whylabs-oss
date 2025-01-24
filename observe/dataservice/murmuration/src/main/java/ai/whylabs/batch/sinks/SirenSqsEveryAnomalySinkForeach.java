package ai.whylabs.batch.sinks;

import ai.whylabs.core.siren.SirenSqsEveryAnomalySink;
import ai.whylabs.core.structures.SirenEveryAnomalyPayload;
import java.io.Serializable;
import java.util.Arrays;
import java.util.Iterator;
import org.apache.spark.api.java.function.ForeachPartitionFunction;

public class SirenSqsEveryAnomalySinkForeach extends SirenSqsEveryAnomalySink
    implements ForeachPartitionFunction<SirenEveryAnomalyPayload>, Serializable {

  public SirenSqsEveryAnomalySinkForeach(String nearRealTimeAlertSqsTopic) {
    super(nearRealTimeAlertSqsTopic);
  }

  @Override
  public void call(Iterator<SirenEveryAnomalyPayload> payload) throws Exception {
    while (payload.hasNext()) {
      send(Arrays.asList(payload.next()));
    }
  }
}
