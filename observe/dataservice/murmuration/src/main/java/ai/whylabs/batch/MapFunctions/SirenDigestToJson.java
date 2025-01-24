package ai.whylabs.batch.MapFunctions;

import ai.whylabs.core.serde.SirenEventSerde;
import ai.whylabs.core.structures.SirenDigestPayload;
import org.apache.spark.api.java.function.MapFunction;

public class SirenDigestToJson implements MapFunction<SirenDigestPayload, String> {
  private transient SirenEventSerde sirenEventJsonSerde;

  @Override
  public String call(SirenDigestPayload sirenDigestPayload) throws Exception {
    if (sirenEventJsonSerde == null) {
      sirenEventJsonSerde = new SirenEventSerde();
    }
    return sirenEventJsonSerde.toJsonString(sirenDigestPayload);
  }
}
