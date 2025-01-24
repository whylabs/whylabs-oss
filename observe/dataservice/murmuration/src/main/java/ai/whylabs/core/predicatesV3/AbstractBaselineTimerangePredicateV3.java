package ai.whylabs.core.predicatesV3;

import ai.whylabs.core.configV3.structure.Baselines.Baseline;
import ai.whylabs.core.configV3.structure.Baselines.ReferenceProfileId;
import ai.whylabs.core.configV3.structure.Baselines.SingleBatchBaseline;
import ai.whylabs.core.configV3.structure.Baselines.TimeRangeBaseline;
import ai.whylabs.core.configV3.structure.Baselines.TrailingWindowBaseline;
import ai.whylabs.core.configV3.structure.enums.Granularity;
import ai.whylabs.core.granularity.ComputeJobGranularities;
import com.google.common.cache.Cache;
import com.google.common.cache.CacheBuilder;
import com.google.common.hash.HashFunction;
import com.google.common.hash.Hashing;
import com.shaded.whylabs.com.apache.commons.lang3.tuple.Pair;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.util.HashSet;
import java.util.Set;
import java.util.concurrent.Callable;
import lombok.SneakyThrows;
import lombok.val;

public class AbstractBaselineTimerangePredicateV3 {
  private long targetBatchTimestamp;
  private Granularity modelGranularity;
  private int lateWindowDays;
  private ZonedDateTime targetBatch;
  private Baseline baseline;
  private Integer targetSize;

  // Used to cache some repetitive date math
  private Pair<Long, Long> previousRange;
  private String previousOrgId;
  private String previousDatasetId;
  private static final Cache<Long, Pair<Long, Long>> NUM_BATCHES_TO_RANGE_CACHE;
  private static final Cache<Long, Pair<Long, Long>> SINGLE_BATCH_RANGE_CACHE;
  private static final Cache<Long, Set<Long>> POTENTIAL_BASELINE_TIMESTAMP_CACHE;

  private static final HashFunction hf;

  static {
    NUM_BATCHES_TO_RANGE_CACHE = CacheBuilder.newBuilder().maximumSize(100000).build();
    SINGLE_BATCH_RANGE_CACHE = CacheBuilder.newBuilder().maximumSize(100000).build();
    POTENTIAL_BASELINE_TIMESTAMP_CACHE = CacheBuilder.newBuilder().maximumSize(100000).build();
    hf = Hashing.md5();
  }

  public AbstractBaselineTimerangePredicateV3(
      long targetBatchTimestamp,
      Granularity granularity,
      int lateWindowDays,
      Baseline baseline,
      int targetSize) {
    this.targetBatchTimestamp = targetBatchTimestamp;
    this.modelGranularity = granularity;
    this.lateWindowDays = lateWindowDays;
    this.targetBatch =
        ZonedDateTime.ofInstant(Instant.ofEpochMilli(targetBatchTimestamp), ZoneOffset.UTC);
    this.baseline = baseline;
    this.targetSize = targetSize;
  }

  /**
   * For a monitor config + model granularity + current date, get a list of potential rollup
   * timestamps. This operation is cached to make it efficient in a tight loop.
   */
  @SneakyThrows
  public Set<Long> getPotentialBaselineTimestamps(Baseline baseline) {
    if (baseline == null || ReferenceProfileId.class.isInstance(baseline)) {
      // Ref profile is timestamped by the ref profile's dataset timestamp. No null entries to fill.
      return new HashSet<>();
    }

    val interval = getRange();
    Long start = interval.getLeft();
    Long end = interval.getRight();

    val hash =
        hf.newHasher()
            .putLong(start)
            .putLong(end)
            .putUnencodedChars(modelGranularity.toString())
            .hash()
            .asLong();
    return POTENTIAL_BASELINE_TIMESTAMP_CACHE.get(
        hash,
        new Callable<Set<Long>>() {
          @Override
          public Set<Long> call() throws Exception {
            Set<Long> potentialRollupTimestamps = new HashSet<>();
            potentialRollupTimestamps.add(start);
            ZonedDateTime rollup =
                ZonedDateTime.ofInstant(Instant.ofEpochMilli(start), ZoneOffset.UTC);
            while (true) {
              rollup = ComputeJobGranularities.add(rollup, modelGranularity, 1);
              long r = rollup.toInstant().toEpochMilli();
              if (r < end) {
                potentialRollupTimestamps.add(r);
              } else {
                break;
              }
            }
            return potentialRollupTimestamps;
          }
        });
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
            .putInt(targetSize)
            .hash()
            .asLong();

    return NUM_BATCHES_TO_RANGE_CACHE.get(
        hash,
        new Callable<Pair<Long, Long>>() {
          @Override
          public Pair<Long, Long> call() {
            ZonedDateTime startOfTarget = targetBatch;
            if (targetSize != null && targetSize > 1) {
              startOfTarget =
                  ComputeJobGranularities.subtract(targetBatch, modelGranularity, targetSize - 1);
            }

            return Pair.of(
                ComputeJobGranularities.subtract(startOfTarget, modelGranularity, n)
                    .toInstant()
                    .toEpochMilli(),
                startOfTarget.toInstant().toEpochMilli());
          }
        });
  }

  @SneakyThrows
  public Pair<Long, Long> getRange() {
    if (TrailingWindowBaseline.class.isInstance(baseline)) {
      val tw = (TrailingWindowBaseline) baseline;
      int size = 7;
      if (tw.getSize() != null) {
        size = tw.getSize();
      }
      return numBatchesToRange(size);
    } else if (TimeRangeBaseline.class.isInstance(baseline)) {
      val tr = (TimeRangeBaseline) baseline;
      return Pair.of(tr.getRange().getGte(), tr.getRange().getLt());
    } else if (SingleBatchBaseline.class.isInstance(baseline)) {
      val sb = (SingleBatchBaseline) baseline;
      val hash =
          hf.newHasher()
              .putInt(sb.getOffset())
              .putLong(targetBatchTimestamp)
              .putUnencodedChars(modelGranularity.toString())
              .hash()
              .asLong();
      return SINGLE_BATCH_RANGE_CACHE.get(
          hash,
          new Callable<Pair<Long, Long>>() {
            @Override
            public Pair<Long, Long> call() {
              // [inclusive start, exclusive of end)
              val start =
                  ComputeJobGranularities.subtract(targetBatch, modelGranularity, sb.getOffset());
              val end = ComputeJobGranularities.add(start, modelGranularity, 1);
              return Pair.of(start.toInstant().toEpochMilli(), end.toInstant().toEpochMilli());
            }
          });
    }
    throw new IllegalArgumentException("Baseline config has no valid range " + baseline);
  }

  /** A specific reference profile is used as the baseline referenced by its profileId */
  private boolean assertReferenceProfileId(String profileId) {
    if (!ReferenceProfileId.class.isInstance(baseline)) {
      return false;
    }
    val rp = (ReferenceProfileId) baseline;
    if (rp.getProfileId() == null) {
      return false;
    } else if (rp.getProfileId().equals(profileId)) {
      return true;
    }
    return false;
  }

  protected boolean test(long ts, String profileId, String orgId, String datasetId) {

    if (baseline == null) {
      return false;
    } else if (ReferenceProfileId.class.isInstance(baseline)) {
      // Monitor configured for a single ref profile
      return assertReferenceProfileId(profileId);
    } else if (profileId != null) {
      // Don't allow ref profiles into the baseline b/c the monitor isn't configured for it
      return false;
    }

    if (orgId != null
        && datasetId != null
        && previousOrgId != null
        && orgId.equals(previousOrgId)
        && datasetId.equals(previousDatasetId)) {
      return assertInterval(ts, previousRange.getLeft(), previousRange.getRight());
    } else {
      val interval = getRange();

      // We tend to run a long string of the same dataset/org combo, cache the date math
      previousRange = interval;
      previousOrgId = orgId;
      previousDatasetId = datasetId;
      return assertInterval(ts, interval.getLeft(), interval.getRight());
    }
  }

  private boolean assertInterval(long ts, long start, long end) {
    return ts >= start && ts < end;
  }
}
