package ai.whylabs.dataservice.util;

import ai.whylabs.core.structures.SirenDigestPayload;
import ai.whylabs.core.structures.SirenEveryAnomalyPayload;
import ai.whylabs.core.utils.JacksonSerializeBooleanAsPrimitive;
import com.fasterxml.jackson.annotation.JsonInclude.Include;
import com.fasterxml.jackson.core.JsonFactory;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.ObjectWriter;
import com.fasterxml.jackson.databind.module.SimpleModule;
import jakarta.inject.Singleton;
import lombok.SneakyThrows;
import lombok.val;

@Singleton
public class SirenEventSerde {

  private ObjectWriter writer;

  private ObjectWriter getWriter() {
    if (writer == null) {
      final ObjectMapper MAPPER = new ObjectMapper(new JsonFactory());
      val sm = new SimpleModule();
      sm.addSerializer(new JacksonSerializeBooleanAsPrimitive());
      MAPPER.registerModule(sm);
      MAPPER.setSerializationInclusion(Include.NON_NULL);
      writer = MAPPER.writer();
    }
    return writer;
  }

  @SneakyThrows
  public String toJsonString(SirenDigestPayload payload) {
    return getWriter().writeValueAsString(payload);
  }

  @SneakyThrows
  public String toJsonString(SirenEveryAnomalyPayload payload) {
    return getWriter().writeValueAsString(payload);
  }
}
