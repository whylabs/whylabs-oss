package ai.whylabs.batch.udfs;

import ai.whylabs.batch.aggregators.VarianceMergeUdaf;
import com.whylogs.core.statistics.datatypes.VarianceTracker;
import org.apache.spark.sql.api.java.UDF2;

public class VarianceExtract implements UDF2<byte[], Integer, Double> {
  public static final String COL = "varianceExtract";

  @Override
  public Double call(byte[] bytes, Integer pos) throws Exception {

    VarianceTracker v = VarianceMergeUdaf.fromProtobuf(bytes);
    if (v != null) {
      switch (pos) {
        case 0:
          return new Double(v.getCount());
        case 1:
          return v.getSum();
        case 2:
          return v.getMean();
        default:
          throw new IllegalArgumentException("Unknown position on variance " + pos);
      }
    }
    return null;
  }
}
