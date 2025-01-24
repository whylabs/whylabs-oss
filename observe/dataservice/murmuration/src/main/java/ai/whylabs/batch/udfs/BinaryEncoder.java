package ai.whylabs.batch.udfs;

import org.apache.spark.sql.api.java.UDF1;
import scala.collection.mutable.WrappedArray;

/**
 * For whatever reason spark is dumping out binary fields as an array of tinyInts in parquet. That
 * doesn't play nice with parquet_fdw. This hacky UDF makes it write the parquet correctly.
 *
 * <p>I'm totally sure there's a better way to do this, but for the moment it gets our profile dumps
 * into useful state.
 */
public class BinaryEncoder implements UDF1<WrappedArray<Byte>, byte[]> {
  public static final String COL = "binaryEncoder";

  @Override
  public byte[] call(WrappedArray<Byte> wrapped) throws Exception {
    if (wrapped == null) {
      return null;
    }

    Byte[] bytes = new Byte[wrapped.size()];
    wrapped.copyToArray(bytes);
    if (bytes.length == 0) {
      return null;
    }
    byte[] b = new byte[bytes.length];
    for (int x = 0; x < bytes.length; x++) {
      b[x] = bytes[x];
    }
    return b;
  }
}
