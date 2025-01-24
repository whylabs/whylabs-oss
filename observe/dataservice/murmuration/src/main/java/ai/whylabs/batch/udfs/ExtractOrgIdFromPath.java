package ai.whylabs.batch.udfs;

import lombok.val;
import org.apache.spark.sql.api.java.UDF1;

public class ExtractOrgIdFromPath implements UDF1<String, String> {
  public static String UDF_NAME = "ExtractOrgIdFromPath";

  @Override
  public String call(String s) throws Exception {
    val parts = s.split("/");
    String filename = parts[parts.length - 1];
    val p = filename.split("-");
    return "org-" + p[1];
  }
}
