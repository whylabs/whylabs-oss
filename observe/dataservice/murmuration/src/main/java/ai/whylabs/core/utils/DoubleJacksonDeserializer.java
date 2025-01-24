package ai.whylabs.core.utils;

import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.databind.DeserializationContext;
import com.fasterxml.jackson.databind.JsonDeserializer;
import java.io.IOException;

public class DoubleJacksonDeserializer extends JsonDeserializer<Double> {
  private static final String LEARNED_THRESHOLD = "learned";

  @Override
  public Double deserialize(JsonParser parser, DeserializationContext context) throws IOException {

    String t = parser.getText();
    /*
     In python threshold gets defined as a float but somewhere in songbird it gets adapted to a
     string if the threshold_choice is specified. TODO: something more clever
    */
    if (t.equals(LEARNED_THRESHOLD)) {
      return null;
    }
    return Double.valueOf(parser.getText());
  }
}
