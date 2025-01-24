package ai.whylabs.batch.udfs;

import ai.whylabs.core.utils.SegmentUtils;
import org.apache.spark.sql.api.java.UDF1;

/**
 * Right now tags are modeled as a json array of kv pairs ["a=b","c=d"]
 *
 * <p>There's been discussion around normalizing that into a separate table in PG so when that
 * happens I imagine we'll change the format we snapshot our parquet files with. TBD
 */
public class PostgresTagJsonConverter implements UDF1<String, String> {
  public static final String COL = "postgresTagJsonConverter";

  @Override
  public String call(String segmentText) throws Exception {
    return SegmentUtils.parseSegmentV3AsJsonCollection(segmentText);
  }
}
