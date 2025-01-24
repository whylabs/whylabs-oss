package ai.whylabs.core.predicates;

import ai.whylabs.core.configV3.structure.enums.Granularity;
import ai.whylabs.core.granularity.BackfillGracePeriodCalculator;
import ai.whylabs.core.granularity.ComputeJobGranularities;
import ai.whylabs.core.structures.ExplodedRow;
import com.google.common.base.Charsets;
import com.google.common.cache.Cache;
import com.google.common.cache.CacheBuilder;
import com.google.common.hash.HashFunction;
import com.google.common.hash.Hashing;
import java.time.Duration;
import java.time.ZonedDateTime;
import java.util.HashSet;
import java.util.Set;
import java.util.concurrent.Callable;
import java.util.function.Predicate;
import lombok.SneakyThrows;
import lombok.val;
import org.apache.commons.lang3.StringUtils;

public class TargetTimeRangePredicateExplodedRow extends AbstractTargetTimeRangePredicate
    implements Predicate<ExplodedRow> {

  private static final Cache<Long, Set<Long>> POTENTIAL_TARGET_TIMESTAMP_CACHE;
  private static final HashFunction hf;

  static {
    POTENTIAL_TARGET_TIMESTAMP_CACHE = CacheBuilder.newBuilder().maximumSize(100000).build();
    hf = Hashing.md5();
  }

  public TargetTimeRangePredicateExplodedRow(
      ZonedDateTime currentTime,
      Granularity granularity,
      int lateWindowDays,
      boolean allowPartialTargetBatches,
      boolean disableTargetRollup) {
    super(currentTime, granularity, lateWindowDays, allowPartialTargetBatches, disableTargetRollup);
  }

  @Override
  public boolean test(ExplodedRow explodedRow) {
    /**
     * Reference profiles are an option for using as a baseline to compare against a target however
     * the reference profiles themselves should not be merged with the target data logged with
     * logAsync. If we encounter one in this target predicate we should ignore it.
     */
    if (!StringUtils.isEmpty(explodedRow.getProfileId())) {
      return false;
    }
    return test(explodedRow.getTs());
  }

  /**
   * Generate a list of target timestamps that are appcilable for a backfill period. In order to
   * have null targets we have to compute the timestamps rather than rely on the data that's
   * aggregated.
   *
   * @param modelGranularity
   * @param currentTime
   * @param backfillGracePeriodDuration // Customers can customize backfill ranges
   * @return
   */
  @SneakyThrows
  public static Set<Long> getPotentialTargetTimestamps(
      Granularity modelGranularity,
      ZonedDateTime currentTime,
      Duration backfillGracePeriodDuration) {

    val h =
        hf.newHasher()
            .putLong(currentTime.toEpochSecond())
            .putUnencodedChars(modelGranularity.toString());
    if (backfillGracePeriodDuration != null) {
      h.putString(backfillGracePeriodDuration.toString(), Charsets.UTF_8);
    }
    val hash = h.hash().asLong();
    return POTENTIAL_TARGET_TIMESTAMP_CACHE.get(
        hash,
        new Callable<Set<Long>>() {
          @Override
          public Set<Long> call() throws Exception {
            Set<Long> potentialRollupTimestamps = new HashSet<>();

            ZonedDateTime startOfTargetBatch =
                ComputeJobGranularities.subtract(
                    ComputeJobGranularities.truncateTimestamp(currentTime, modelGranularity),
                    modelGranularity,
                    1);
            long earliestTargetBatch = Long.MAX_VALUE;
            if (backfillGracePeriodDuration != null) {
              earliestTargetBatch =
                  startOfTargetBatch.minus(backfillGracePeriodDuration).toInstant().toEpochMilli();
            } else {
              earliestTargetBatch =
                  startOfTargetBatch
                      .minusDays(BackfillGracePeriodCalculator.getDays(modelGranularity))
                      .toInstant()
                      .toEpochMilli();
            }
            potentialRollupTimestamps.add(startOfTargetBatch.toInstant().toEpochMilli());

            while (true) {
              startOfTargetBatch =
                  ComputeJobGranularities.subtract(startOfTargetBatch, modelGranularity, 1);
              long startOfTargetBatchMillis = startOfTargetBatch.toInstant().toEpochMilli();
              // Note 10k is just a sanity check, should never happen unless there's a bug. Avoid
              // oom
              if (startOfTargetBatchMillis <= earliestTargetBatch
                  || potentialRollupTimestamps.size() > 10000) {
                break;
              }
              potentialRollupTimestamps.add(startOfTargetBatchMillis);
            }

            return potentialRollupTimestamps;
          }
        });
  }
}
