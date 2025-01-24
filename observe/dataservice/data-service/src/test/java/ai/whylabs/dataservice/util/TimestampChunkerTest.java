package ai.whylabs.dataservice.util;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.sql.Timestamp;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import lombok.val;
import org.junit.jupiter.api.Test;

public class TimestampChunkerTest {
  @Test
  public void testSingle() {

    val ts =
        new Timestamp(
            ZonedDateTime.parse("2023-12-01T00:00:00.000Z", DateTimeFormatter.ISO_OFFSET_DATE_TIME)
                .toInstant()
                .toEpochMilli());
    val chunks = TimestampChunker.chunkTimestampsByDay(ts, ts);
    assertEquals(1, chunks.size());
    assertEquals(chunks.get(0).getKey(), ts);
    assertEquals(
        chunks.get(0).getValue(),
        new Timestamp(
            ZonedDateTime.parse("2023-12-02T00:00:00.000Z", DateTimeFormatter.ISO_OFFSET_DATE_TIME)
                .toInstant()
                .toEpochMilli()));
  }

  @Test
  public void testMultiple() {
    val ts =
        new Timestamp(
            ZonedDateTime.parse("2023-12-01T00:00:00.000Z", DateTimeFormatter.ISO_OFFSET_DATE_TIME)
                .toInstant()
                .toEpochMilli());
    val ts2 =
        new Timestamp(
            ZonedDateTime.parse("2023-12-03T01:00:00.000Z", DateTimeFormatter.ISO_OFFSET_DATE_TIME)
                .toInstant()
                .toEpochMilli());
    val chunks = TimestampChunker.chunkTimestampsByDay(ts, ts2);
    assertEquals(3, chunks.size());
    assertEquals(chunks.get(0).getKey(), ts);
    assertEquals(
        chunks.get(0).getValue(),
        new Timestamp(
            ZonedDateTime.parse("2023-12-02T00:00:00.000Z", DateTimeFormatter.ISO_OFFSET_DATE_TIME)
                .toInstant()
                .toEpochMilli()));
    assertEquals(
        chunks.get(1).getKey(),
        new Timestamp(
            ZonedDateTime.parse("2023-12-02T00:00:00.000Z", DateTimeFormatter.ISO_OFFSET_DATE_TIME)
                .toInstant()
                .toEpochMilli()));
    assertEquals(
        chunks.get(1).getValue(),
        new Timestamp(
            ZonedDateTime.parse("2023-12-03T00:00:00.000Z", DateTimeFormatter.ISO_OFFSET_DATE_TIME)
                .toInstant()
                .toEpochMilli()));
    assertEquals(
        chunks.get(2).getKey(),
        new Timestamp(
            ZonedDateTime.parse("2023-12-03T00:00:00.000Z", DateTimeFormatter.ISO_OFFSET_DATE_TIME)
                .toInstant()
                .toEpochMilli()));
    assertEquals(
        chunks.get(2).getValue(),
        new Timestamp(
            ZonedDateTime.parse("2023-12-04T00:00:00.000Z", DateTimeFormatter.ISO_OFFSET_DATE_TIME)
                .toInstant()
                .toEpochMilli()));
  }
}
