package ai.whylabs.druid.whylogs.frequency;

import com.fasterxml.jackson.core.JsonGenerator;
import com.fasterxml.jackson.databind.JsonSerializer;
import com.fasterxml.jackson.databind.SerializerProvider;
import com.shaded.whylabs.org.apache.datasketches.frequencies.ItemsSketch;
import java.io.IOException;

public class FrequencBaseClassJsonSerializer extends JsonSerializer<ItemsSketch> {

  @Override
  public void serialize(
      final ItemsSketch sketch, final JsonGenerator generator, final SerializerProvider provider)
      throws IOException {
    generator.writeBinary(FrequencyOperations.serialize(sketch));
  }
}
