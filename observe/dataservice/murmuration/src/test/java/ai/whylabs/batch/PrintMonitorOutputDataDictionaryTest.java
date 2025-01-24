package ai.whylabs.batch;

import ai.whylabs.core.structures.AnalyzerRun;
import ai.whylabs.core.structures.monitor.events.AnalyzerResult;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.module.jsonSchema.JsonSchema;
import com.fasterxml.jackson.module.jsonSchema.factories.SchemaFactoryWrapper;
import org.testng.annotations.Test;

public class PrintMonitorOutputDataDictionaryTest {

  @Test
  public void printDataDictionaries() throws JsonProcessingException {
    ObjectMapper mapper = new ObjectMapper();
    SchemaFactoryWrapper wrapper = new SchemaFactoryWrapper();
    mapper.acceptJsonFormatVisitor(AnalyzerRun.class, wrapper);
    JsonSchema jsonSchema = wrapper.finalSchema();

    System.out.println(mapper.writeValueAsString(jsonSchema));

    SchemaFactoryWrapper wrapper2 = new SchemaFactoryWrapper();
    ObjectMapper mapper2 = new ObjectMapper();
    mapper2.acceptJsonFormatVisitor(AnalyzerResult.class, wrapper2);
    JsonSchema jsonSchema2 = wrapper2.finalSchema();

    System.out.println(mapper2.writeValueAsString(jsonSchema2));
  }
}
