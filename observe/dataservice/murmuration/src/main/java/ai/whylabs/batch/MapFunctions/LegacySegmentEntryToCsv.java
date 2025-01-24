package ai.whylabs.batch.MapFunctions;

import ai.whylabs.core.structures.LegacySegmentTableEntry;
import org.apache.spark.api.java.function.MapFunction;

public class LegacySegmentEntryToCsv implements MapFunction<LegacySegmentTableEntry, String> {

  @Override
  public String call(LegacySegmentTableEntry row) throws Exception {
    return row.toCsv();
  }
}
