package ai.whylabs.core.predicates;

import ai.whylabs.core.configV3.structure.enums.Granularity;
import ai.whylabs.core.granularity.ComputeJobGranularities;
import com.google.common.cache.Cache;
import com.google.common.cache.CacheBuilder;
import com.google.common.hash.HashFunction;
import com.google.common.hash.Hashing;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.util.Set;
import java.util.concurrent.Callable;
import lombok.SneakyThrows;
import lombok.val;
import org.apache.commons.lang3.tuple.Pair;

public class AbstractBaselineTimerangePredicate {
  private long targetBatchTimestamp;
  private Granularity modelGranularity;
  private int lateWindowDays;
  public static final int GLOBAL_NUM_BATCHES_DEFAULT = 7;
  private ZonedDateTime targetBatch;

  // Used to cache some repetitive date math
  private Pair<Long, Long> previousRange;
  private String previousOrgId;
  private String previousDatasetId;
  private static final Cache<Long, Long> DATE_MATH_CACHE;
  private static final Cache<Long, Set<Long>> POTENTIAL_ROLLUP_TIMESTAMP_CACHE;

  private static final HashFunction hf;

  static {
    DATE_MATH_CACHE = CacheBuilder.newBuilder().maximumSize(100000).build();
    POTENTIAL_ROLLUP_TIMESTAMP_CACHE = CacheBuilder.newBuilder().maximumSize(100000).build();
    hf = Hashing.md5();
  }

  /**
   * Note about lateWindowDays. Generally folks upload today's data today and we run monitor at the
   * end of the day. Similar for hourly. Late window is a concept borrowed from the streaming world
   * https://nightlies.apache.org/flink/flink-docs-release-1.13/docs/dev/datastream/operators/windows/#allowed-lateness
   * which applies to customers that upload data on a 24hr delay. In our case when computing
   * baselines we have two modes.
   *
   * <p>1) Exploding profiles is expensive so we want to filter out any irrelevant records before
   * the explode. In that case we'll use lateWindowDays=7 to expand the range of data we explode so
   * that we can calculate monitor events for multiple targetBatchTimestamps in a single pass over
   * the data.
   *
   * <p>2) Deeper in the job when filtering for a single targetBatchTimestamp we'll set
   * lateWindowDays=0 to narrow the baseline to a single window.
   */
  public AbstractBaselineTimerangePredicate(
      long targetBatchTimestamp, Granularity granularity, int lateWindowDays) {
    this.targetBatchTimestamp = targetBatchTimestamp;
    this.modelGranularity = granularity;
    this.lateWindowDays = lateWindowDays;
    this.targetBatch =
        ZonedDateTime.ofInstant(Instant.ofEpochMilli(targetBatchTimestamp), ZoneOffset.UTC);
  }

  @SneakyThrows
  private Pair<Long, Long> numBatchesToRange(int numBatches) {
    if (lateWindowDays > 0) {
      numBatches =
          numBatches
              + ComputeJobGranularities.getLateWindowBatches(modelGranularity, lateWindowDays);
    }
    final int n = numBatches;

    val hash =
        hf.newHasher()
            .putInt(numBatches)
            .putLong(targetBatchTimestamp)
            .putInt(lateWindowDays)
            .putUnencodedChars(modelGranularity.toString())
            .hash()
            .asLong();

    Long start =
        DATE_MATH_CACHE.get(
            hash,
            new Callable<Long>() {
              @Override
              public Long call() throws Exception {
                return ComputeJobGranularities.subtract(targetBatch, modelGranularity, n)
                    .toInstant() //
                    .toEpochMilli();
              }
            });

    return Pair.of(start, targetBatchTimestamp);
  }
}
