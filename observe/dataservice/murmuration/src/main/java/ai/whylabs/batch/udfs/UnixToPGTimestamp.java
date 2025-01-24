package ai.whylabs.batch.udfs;

import java.time.Instant;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import org.apache.spark.sql.api.java.UDF1;

public class UnixToPGTimestamp implements UDF1<Long, String> {
  @Override
  public String call(Long ts) throws Exception {
    if (ts == null) {
      return null;
    }
    return ZonedDateTime.ofInstant(Instant.ofEpochMilli(ts), ZoneOffset.UTC).toString();
  }
}
