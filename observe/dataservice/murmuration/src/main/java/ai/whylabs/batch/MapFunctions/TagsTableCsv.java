package ai.whylabs.batch.MapFunctions;

import ai.whylabs.core.structures.TagTableRow;
import org.apache.spark.api.java.function.MapFunction;

public class TagsTableCsv implements MapFunction<TagTableRow, String> {

  @Override
  public String call(TagTableRow row) throws Exception {
    return row.toCsv();
  }
}
