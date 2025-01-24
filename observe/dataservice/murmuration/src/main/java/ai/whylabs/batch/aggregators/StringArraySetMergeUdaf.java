package ai.whylabs.batch.aggregators;

import java.util.Arrays;
import java.util.HashSet;
import lombok.val;
import org.apache.commons.lang.StringUtils;
import org.apache.spark.sql.Encoder;
import org.apache.spark.sql.Encoders;
import org.apache.spark.sql.expressions.Aggregator;

/**
 * Weirdly enough spark doesn't support set merging on array columns so we have to use a UDAF to
 * uniquely merge monitorIds. This is a pretty hacky way of doing it, so feel free to redo it when
 * there's cycles
 */
public class StringArraySetMergeUdaf extends Aggregator<String, String, String> {
  public static final String DELIMETER = ",";

  @Override
  public String zero() {
    return "";
  }

  @Override
  public String reduce(String b, String a) {
    val s = new HashSet<String>();
    if (a != null) {
      s.addAll(Arrays.asList(StringUtils.split(a, DELIMETER)));
    }
    if (b != null) {
      s.addAll(Arrays.asList(StringUtils.split(b, DELIMETER)));
    }

    return StringUtils.join(s, DELIMETER);
  }

  @Override
  public String merge(String b1, String b2) {
    return reduce(b1, b2);
  }

  @Override
  public String finish(String reduction) {
    return reduction;
  }

  @Override
  public Encoder<String> bufferEncoder() {
    return Encoders.STRING();
  }

  @Override
  public Encoder<String> outputEncoder() {
    return Encoders.STRING();
  }
}
