package ai.whylabs.druid.whylogs.frequency;

import com.fasterxml.jackson.core.JsonGenerator;
import com.fasterxml.jackson.databind.JsonSerializer;
import com.fasterxml.jackson.databind.SerializerProvider;
import java.io.IOException;

public class FrequencyJsonSerializer extends JsonSerializer<StringItemSketch> {

  @Override
  public void serialize(
      final StringItemSketch sketch,
      final JsonGenerator generator,
      final SerializerProvider provider)
      throws IOException {
    generator.writeBinary(FrequencyOperations.serialize(sketch));
  }
}
