package ai.whylabs.dataservice.util;

import java.sql.Timestamp;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import org.apache.commons.lang3.tuple.Pair;

public class TimestampChunker {
  /**
   * Chunk an interval of java sql timestamps into 1/day for chunking sql queries
   *
   * @param start
   * @param end
   * @return
   */
  public static List<Pair<Timestamp, Timestamp>> chunkTimestampsByDay(
      Timestamp start, Timestamp end) {
    List<Pair<Timestamp, Timestamp>> chunks = new ArrayList<>();

    ZonedDateTime start1 =
        ZonedDateTime.ofInstant(
            Instant.ofEpochMilli(start.toInstant().toEpochMilli()), ZoneOffset.UTC);
    ZonedDateTime end1 =
        ZonedDateTime.ofInstant(
            Instant.ofEpochMilli(end.toInstant().toEpochMilli()), ZoneOffset.UTC);
    long days = ChronoUnit.DAYS.between(start1, end1);
    for (int offset = 0; offset < days + 1; offset++) {
      chunks.add(
          Pair.of(
              new Timestamp(start.toInstant().plus(offset, ChronoUnit.DAYS).toEpochMilli()),
              new Timestamp(start.toInstant().plus(offset + 1, ChronoUnit.DAYS).toEpochMilli())));
    }
    return chunks;
  }
}
