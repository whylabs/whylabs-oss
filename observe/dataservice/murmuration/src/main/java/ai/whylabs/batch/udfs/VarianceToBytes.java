package ai.whylabs.batch.udfs;

import com.whylogs.v0.core.message.VarianceMessage;
import java.util.List;
import org.apache.spark.sql.api.java.UDF1;
import scala.collection.JavaConverters;
import scala.collection.mutable.WrappedArray;

/**
 * Encode variance into a protobuf to avoid issues with spark's flimsy udaf array support in the
 * java API
 */
public class VarianceToBytes implements UDF1<WrappedArray<Double>, byte[]> {
  public static final String COL = "varianceEncoder";

  @Override
  public byte[] call(WrappedArray<Double> doubleWrappedArray) throws Exception {
    if (doubleWrappedArray == null || doubleWrappedArray.size() == 0) {
      return null;
    }
    List<Double> l = JavaConverters.mutableSeqAsJavaList(doubleWrappedArray);
    if (l.get(0) == null || l.get(1) == null || l.get(2) == null) {
      return null;
    }

    return VarianceMessage.newBuilder()
        .setCount(l.get(0).longValue())
        .setSum(l.get(1))
        .setMean(l.get(2))
        .build()
        .toByteArray();
  }
}
