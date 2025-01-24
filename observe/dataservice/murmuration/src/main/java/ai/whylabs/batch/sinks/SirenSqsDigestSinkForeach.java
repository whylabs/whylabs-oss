package ai.whylabs.batch.sinks;

import ai.whylabs.core.siren.SirenSqsDigestSink;
import ai.whylabs.core.structures.SirenDigestPayload;
import java.io.Serializable;
import java.util.Arrays;
import java.util.Iterator;
import org.apache.spark.api.java.function.ForeachPartitionFunction;

public class SirenSqsDigestSinkForeach extends SirenSqsDigestSink
    implements ForeachPartitionFunction<SirenDigestPayload>, Serializable {

  public SirenSqsDigestSinkForeach(String nearRealTimeAlertSqsTopic) {
    super(nearRealTimeAlertSqsTopic);
  }

  @Override
  public void call(Iterator<SirenDigestPayload> payloads) throws Exception {
    while (payloads.hasNext()) {
      send(Arrays.asList(payloads.next()));
    }
  }
}
