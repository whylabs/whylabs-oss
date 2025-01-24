package ai.whylabs.dataservice.util;

import com.google.gson.JsonParser;
import java.io.BufferedReader;
import java.util.Iterator;
import lombok.SneakyThrows;
import lombok.val;
import org.apache.commons.lang3.tuple.Pair;

/**
 * Parse a dynamodb->S3 dump stream of the songbird metadata table looking for deleted datasets
 *
 * <p>Typical row for a deleted dataset { "Item": { "pk": { "S": "ORG#org-Z7aTW2#MODEL#model-5" },
 * "sk": { "S": "MODEL" }, "model_name": { "S": "model name" }, "org_id": { "S": "org-Z7aTW2" },
 * "timePeriod": { "S": "P1D" }, "model_type": { "S": "CLASSIFICATION" }, "model_id": { "S":
 * "model-5" }, "creation_time": { "S": "2023-05-30T20:10:41.722Z" }, "active": { "N": "0" } } }
 */
public class SongbirdDynamoDumpReader implements Iterator<Pair<String, String>> {

  private BufferedReader in;
  private Pair<String, String> buff;

  public SongbirdDynamoDumpReader(BufferedReader in) {
    this.in = in;
  }

  @SneakyThrows
  @Override
  public boolean hasNext() {
    String content = null;
    buff = null;
    while ((content = in.readLine()) != null) {
      int c = 0;
      val jso = new JsonParser().parse(content).getAsJsonObject().get("Item").getAsJsonObject();

      if (!jso.get("sk").getAsJsonObject().get("S").getAsString().equalsIgnoreCase("MODEL")) {
        continue;
      }
      val active = jso.get("active");
      if (active == null || !active.getAsJsonObject().get("N").getAsString().equals("0")) {
        continue;
      }
      String orgId = jso.get("org_id").getAsJsonObject().get("S").getAsString();
      String datasetId = jso.get("model_id").getAsJsonObject().get("S").getAsString();
      buff = Pair.of(orgId, datasetId);
      return true;
    }
    return buff != null;
  }

  @Override
  public Pair<String, String> next() {
    return buff;
  }
}
