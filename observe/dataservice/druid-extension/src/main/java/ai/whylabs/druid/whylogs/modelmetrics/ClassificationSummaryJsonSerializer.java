package ai.whylabs.druid.whylogs.modelmetrics;

import com.fasterxml.jackson.core.JsonGenerator;
import com.fasterxml.jackson.databind.JsonSerializer;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializerProvider;
import java.io.IOException;

public class ClassificationSummaryJsonSerializer extends JsonSerializer<ClassificationSummary> {

  @Override
  public void serialize(
      final ClassificationSummary summary,
      final JsonGenerator generator,
      final SerializerProvider provider)
      throws IOException {

    ObjectMapper mapper = new ObjectMapper();
    String jsonString = mapper.writeValueAsString(summary);
    generator.writeString(jsonString);
  }
}
