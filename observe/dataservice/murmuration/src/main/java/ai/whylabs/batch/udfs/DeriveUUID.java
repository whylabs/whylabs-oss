package ai.whylabs.batch.udfs;

import java.nio.charset.StandardCharsets;
import java.util.UUID;
import org.apache.spark.sql.api.java.UDF4;

public class DeriveUUID implements UDF4<String, String, String, String, String> {
  public static final String COL = "deriveUUID";

  @Override
  public String call(String orgId, String datasetId, String runId, String analyzerId)
      throws Exception {
    return UUID.nameUUIDFromBytes(
            new StringBuilder()
                .append(orgId)
                .append(datasetId)
                .append(runId)
                .append(analyzerId)
                .toString()
                .getBytes(StandardCharsets.UTF_8))
        .toString();
  }
}
