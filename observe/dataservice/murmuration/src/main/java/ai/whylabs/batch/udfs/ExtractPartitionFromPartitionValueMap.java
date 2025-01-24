package ai.whylabs.batch.udfs;

import static scala.collection.JavaConverters.mapAsJavaMap;

import lombok.val;
import org.apache.spark.sql.api.java.UDF1;
import scala.collection.immutable.Map;

public class ExtractPartitionFromPartitionValueMap
    implements UDF1<scala.collection.immutable.Map, String> {

  @Override
  public String call(Map map) throws Exception {
    java.util.Map<String, String> m = mapAsJavaMap(map);
    for (val e : m.values()) {
      return e;
    }
    return null;
  }
}
