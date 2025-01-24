package ai.whylabs.batch.MapFunctions;

import ai.whylabs.core.structures.monitor.events.AnalyzerResult;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.PropertyNamingStrategy;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import lombok.val;
import org.apache.spark.api.java.function.MapPartitionsFunction;

public class AnalyzerResultToJson implements MapPartitionsFunction<AnalyzerResult, String> {

  private transient ObjectMapper objectMapper;

  @Override
  public Iterator<String> call(Iterator<AnalyzerResult> input) throws Exception {
    List<String> results = new ArrayList();
    while (input.hasNext()) {
      val value = input.next();
      // Camel case keys for postgres when generating json
      if (objectMapper == null) {
        objectMapper = new ObjectMapper();
        objectMapper.setPropertyNamingStrategy(PropertyNamingStrategy.SNAKE_CASE);
      }

      // PG expects double backslash escaped json
      results.add(objectMapper.writeValueAsString(value).replace("\\\"", "\\\\\""));
    }
    return results.iterator();
  }
}
