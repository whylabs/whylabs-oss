package ai.whylabs.druid.whylogs.schematracker;

import com.fasterxml.jackson.core.JsonGenerator;
import com.fasterxml.jackson.databind.JsonSerializer;
import com.fasterxml.jackson.databind.SerializerProvider;
import java.io.IOException;

public class InferredTypeJsonSerializer
    extends JsonSerializer<InferredTypePostAggregatorResultStructure> {

  @Override
  public void serialize(
      InferredTypePostAggregatorResultStructure value,
      JsonGenerator gen,
      SerializerProvider serializers)
      throws IOException {

    gen.writeStartObject();
    gen.writeNumberField("ratio", value.getRatio());
    gen.writeStringField("type", value.getType().name());
    gen.writeEndObject();
  }
}
