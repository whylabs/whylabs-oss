package ai.whylabs.batch.MapFunctions;

import ai.whylabs.core.structures.Org;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.Serializable;
import java.util.Arrays;
import java.util.Collections;
import java.util.Iterator;
import org.apache.commons.lang3.StringUtils;
import org.apache.spark.api.java.function.FlatMapFunction;
import org.apache.spark.sql.Row;

public class ReadOrgConfigJson implements FlatMapFunction<Row, Org>, Serializable {

  private transient ObjectMapper objectMapper;

  @Override
  public Iterator<Org> call(Row row) throws Exception {
    if (objectMapper == null) {
      objectMapper = new ObjectMapper();
    }

    String json = (String) row.get(0);
    if (StringUtils.isEmpty(json)) {
      return Collections.emptyIterator();
    }
    return Arrays.asList(objectMapper.readValue(json, Org.class)).iterator();
  }
}
