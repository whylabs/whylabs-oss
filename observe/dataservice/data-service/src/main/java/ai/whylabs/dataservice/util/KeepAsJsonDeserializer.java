package ai.whylabs.dataservice.util;

import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.core.TreeNode;
import com.fasterxml.jackson.databind.DeserializationContext;
import com.fasterxml.jackson.databind.JsonDeserializer;
import java.io.IOException;

/**
 * Keeps json value as json, does not try to deserialize it
 *
 * @author roytruelove
 */
public class KeepAsJsonDeserializer extends JsonDeserializer<String> {

  @Override
  public String deserialize(JsonParser jp, DeserializationContext ctxt) throws IOException {

    TreeNode tree = jp.getCodec().readTree(jp);
    return tree.toString();
  }
}
