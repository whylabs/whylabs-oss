package ai.whylabs.dataservice.util;

import com.google.common.collect.Lists;
import com.google.common.math.IntMath;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import lombok.val;
import org.joda.time.DateTime;
import org.joda.time.DateTimeZone;
import org.joda.time.Interval;

public class IntervalChunker {

  /**
   * Chop up an interval into batches with non-contiguous dates within each batch. That way you can
   * multithread a batch across multiple concurrent transactions while guarunteed not to be working
   * on the same hypertable partition.
   */
  public static List<List<Interval>> getBatches(Interval i, Integer maxBatchSize) {
    List<Interval> chunks = chunkNonContigousMonthly(i);
    if (chunks.size() == 1) {
      return Arrays.asList(chunks);
    }

    if (chunks.size() < maxBatchSize) {
      int partitionSize = IntMath.divide(chunks.size(), 2, RoundingMode.UP);
      return Lists.partition(chunks, partitionSize);
    } else {
      return Lists.partition(chunks, maxBatchSize);
    }
  }

  /**
   * Timescaledb chunks by every 7 days. We want to chunk upserts by month but two months might span
   * a shared partition. By chunking months non-contiguously we're able to parallelize ingestion
   * with zero chance of row lock contention because multiple threads will never be messing with the
   * same partition at the same time. This method does such a chunking. EG
   * 2020-10-08T00:00:00.000Z/2024-03-20T00:00:00.000Z splits up
   *
   * <p>2020-10-08T00:00:00.000Z/2020-11-07T00:00:00.000Z
   * 2020-12-07T00:00:00.000Z/2021-01-06T00:00:00.000Z
   * 2021-02-05T00:00:00.000Z/2021-03-07T00:00:00.000Z
   * 2021-04-06T00:00:00.000Z/2021-05-06T00:00:00.000Z ...
   * 2024-02-20T00:00:00.000Z/2024-03-20T00:00:00.000Z
   */
  public static List<Interval> chunkNonContigousMonthly(Interval i) {
    DateTimeZone.setDefault(DateTimeZone.UTC);
    List<Interval> sortedMonthlyChunks = new ArrayList<>();
    DateTime anchor = i.getStart();
    val end = i.getEnd();
    while (true) {
      DateTime endPost = anchor.plusDays(30);
      if (endPost.isAfter(end)) {
        endPost = end;
        val chunk = new Interval(anchor, endPost);
        sortedMonthlyChunks.add(chunk);
        return interLeave(sortedMonthlyChunks);
      } else {
        val chunk = new Interval(anchor, endPost);
        sortedMonthlyChunks.add(chunk);
        anchor = endPost;
      }
    }
  }

  private static List<Interval> interLeave(List<Interval> chunks) {
    List<Interval> chunksInterleaved = new ArrayList<>();
    for (int x = 0; x < chunks.size(); x += 2) {
      chunksInterleaved.add(chunks.get(x));
    }
    for (int x = 1; x < chunks.size(); x += 2) {
      chunksInterleaved.add(chunks.get(x));
    }
    return chunksInterleaved;
  }
}
