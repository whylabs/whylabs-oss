package ai.whylabs.druid.whylogs.variance;

import com.fasterxml.jackson.core.JsonGenerator;
import com.fasterxml.jackson.databind.JsonSerializer;
import com.fasterxml.jackson.databind.SerializerProvider;
import com.whylogs.core.statistics.datatypes.VarianceTracker;
import java.io.IOException;

public class VarianceJsonSerializer extends JsonSerializer<VarianceTracker> {

  @Override
  public void serialize(
      final VarianceTracker tracker,
      final JsonGenerator generator,
      final SerializerProvider provider)
      throws IOException {
    generator.writeBinary(tracker.toProtobuf().build().toByteArray());
  }
}
