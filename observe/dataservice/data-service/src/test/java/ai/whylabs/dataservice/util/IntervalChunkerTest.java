package ai.whylabs.dataservice.util;

import static org.junit.Assert.assertEquals;

import lombok.val;
import org.joda.time.DateTimeZone;
import org.joda.time.Interval;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

public class IntervalChunkerTest {

  @BeforeEach
  public void before() {
    DateTimeZone.setDefault(DateTimeZone.UTC);
  }

  @Test
  public void testBatcher() {
    val i = new Interval("2020-10-08T00:00:00.000Z/2024-03-20T00:00:00.000Z");
    val batches = IntervalChunker.getBatches(i, 5);
    assertEquals(batches.size(), 9);
  }

  @Test
  public void testBatcherSmall() {
    val i = new Interval("2020-10-08T00:00:00.000Z/2020-10-09T00:00:00.000Z");
    val batches = IntervalChunker.getBatches(i, 5);
    assertEquals(batches.size(), 1);
  }

  @Test
  public void testBatcherSmall2() {
    val i = new Interval("2020-10-08T00:00:00.000Z/2020-11-15T00:00:00.000Z");
    val batches = IntervalChunker.getBatches(i, 5);
    assertEquals(batches.size(), 2);
  }

  @Test
  public void testBatcherSmall3() {
    val i = new Interval("2020-10-08T00:00:00.000Z/2020-12-15T00:00:00.000Z");
    val batches = IntervalChunker.getBatches(i, 5);
    assertEquals(batches.size(), 2);
  }

  @Test
  public void testChunker() {
    val i = new Interval("2020-10-08T00:00:00.000Z/2024-03-20T00:00:00.000Z");

    val interleaved = IntervalChunker.chunkNonContigousMonthly(i);
    assertEquals(42, interleaved.size());
    assertEquals(
        "2020-10-08T00:00:00.000Z/2020-11-07T00:00:00.000Z", interleaved.get(0).toString());
    assertEquals(
        "2020-12-07T00:00:00.000Z/2021-01-06T00:00:00.000Z", interleaved.get(1).toString());
    assertEquals(
        "2024-02-20T00:00:00.000Z/2024-03-20T00:00:00.000Z", interleaved.get(41).toString());
  }

  @Test
  public void testChunkerShort() {
    val i = new Interval("2020-10-08T00:00:00.000Z/2020-10-11T00:00:00.000Z");

    val interleaved = IntervalChunker.chunkNonContigousMonthly(i);
    assertEquals(1, interleaved.size());
    assertEquals(
        "2020-10-08T00:00:00.000Z/2020-10-11T00:00:00.000Z", interleaved.get(0).toString());
  }
}
