package ai.whylabs.batch.udfs;

import ai.whylabs.core.utils.SegmentUtils;
import lombok.val;
import org.apache.spark.sql.api.java.UDF1;

/** Extract the key from a segment k/v pair string */
public class SegmentTagToKey implements UDF1<String, String> {

  @Override
  public String call(String s) throws Exception {
    val tags = SegmentUtils.parseSegmentV3(s);
    if (tags == null) {
      return null;
    }
    if (tags.size() > 1) {
      throw new IllegalArgumentException("Multiple tags, can't parse a single value" + s);
    }
    return tags.get(0).getKey();
  }
}
