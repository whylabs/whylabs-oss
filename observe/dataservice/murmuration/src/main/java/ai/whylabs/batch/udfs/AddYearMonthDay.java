package ai.whylabs.batch.udfs;

import java.time.Instant;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import lombok.val;
import org.apache.spark.sql.api.java.UDF1;

public class AddYearMonthDay implements UDF1<Long, String> {
  public static final String UDF_NAME = "yearMonthDay";

  private static DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyyMMdd");

  @Override
  public String call(Long ts) {
    if (ts == null) {
      return "";
    }
    val started = ZonedDateTime.ofInstant(Instant.ofEpochMilli(ts), ZoneOffset.UTC);
    return started.format(formatter);
  }
}
