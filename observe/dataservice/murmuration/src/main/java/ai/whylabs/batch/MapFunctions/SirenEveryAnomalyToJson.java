package ai.whylabs.batch.MapFunctions;

import ai.whylabs.core.serde.SirenEventSerde;
import ai.whylabs.core.structures.SirenEveryAnomalyPayload;
import org.apache.spark.api.java.function.MapFunction;

public class SirenEveryAnomalyToJson implements MapFunction<SirenEveryAnomalyPayload, String> {
  private transient SirenEventSerde sirenEventJsonSerde;

  @Override
  public String call(SirenEveryAnomalyPayload sirenEveryAnomalyPayload) throws Exception {
    if (sirenEventJsonSerde == null) {
      sirenEventJsonSerde = new SirenEventSerde();
    }
    return sirenEventJsonSerde.toJsonString(sirenEveryAnomalyPayload);
  }
}
