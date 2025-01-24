package ai.whylabs.druid.whylogs.modelmetrics;

import com.fasterxml.jackson.core.JsonGenerator;
import com.fasterxml.jackson.databind.JsonSerializer;
import com.fasterxml.jackson.databind.SerializerProvider;
import java.io.IOException;

public class DruidModelMetricsJsonSerializer extends JsonSerializer<DruidModelMetrics> {

  @Override
  public void serialize(
      final DruidModelMetrics metrics,
      final JsonGenerator generator,
      final SerializerProvider provider)
      throws IOException {
    generator.writeBinary(metrics.toProtobuf().build().toByteArray());
  }
}
