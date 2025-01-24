package ai.whylabs.core.utils;

import com.fasterxml.jackson.core.JsonGenerator;
import com.fasterxml.jackson.databind.JsonSerializer;
import com.fasterxml.jackson.databind.SerializerProvider;
import java.io.IOException;
import java.io.Serializable;

/** Rather than a textual true/false, serialize booleans as 0 or 1 */
public class JacksonSerializeBooleanAsPrimitive extends JsonSerializer<Boolean>
    implements Serializable {
  @Override
  public void serialize(
      Boolean b, JsonGenerator jsonGenerator, SerializerProvider serializerProvider)
      throws IOException {
    jsonGenerator.writeNumber(b ? 1 : 0);
  }

  public Class<Boolean> handledType() {
    return Boolean.class;
  }
}
