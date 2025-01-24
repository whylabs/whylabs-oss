package ai.whylabs.druid.whylogs.kll;

import com.fasterxml.jackson.core.JsonGenerator;
import com.fasterxml.jackson.databind.JsonSerializer;
import com.fasterxml.jackson.databind.SerializerProvider;
import com.shaded.whylabs.org.apache.datasketches.kll.KllDoublesSketch;
import java.io.IOException;

public class KllDoublesSketchJsonSerializer extends JsonSerializer<KllDoublesSketch> {

  @Override
  public void serialize(
      final KllDoublesSketch sketch,
      final JsonGenerator generator,
      final SerializerProvider provider)
      throws IOException {
    generator.writeBinary(sketch.toByteArray());
  }
}
