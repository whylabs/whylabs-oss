package ai.whylabs.batch.udfs;

import org.apache.spark.sql.api.java.UDF1;

/**
 * Funny story, there's no way to determine the length of a binary field with spark sql that I can
 * find. Soooo here's a UDF that does that.
 */
public class DetermineLength implements UDF1<byte[], Long> {
  public static final String name = "determineLength";

  @Override
  public Long call(byte[] bytes) throws Exception {
    return Long.valueOf(bytes.length);
  }
}
