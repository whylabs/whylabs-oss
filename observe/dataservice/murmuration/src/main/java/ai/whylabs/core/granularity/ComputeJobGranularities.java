package ai.whylabs.core.granularity;

import ai.whylabs.core.configV3.structure.MonitorConfigV3;
import ai.whylabs.core.configV3.structure.enums.Granularity;
import ai.whylabs.core.enums.IngestionRollupGranularity;
import com.google.common.cache.Cache;
import com.google.common.cache.CacheBuilder;
import java.time.DayOfWeek;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.time.temporal.ChronoUnit;
import java.util.concurrent.Callable;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import lombok.val;

@Slf4j
public class ComputeJobGranularities {

  @AllArgsConstructor
  @EqualsAndHashCode
  private static class CacheKey {
    private Long ts;
    private Granularity granularity;
  }

  // Based on JVM profiling date math here in a tight loop gets expensive, caching ts truncations
  private static final Cache<CacheKey, ZonedDateTime> BASELINE_ROLLUP_TIMESTAMP_CACHE;
  private static final Cache<CacheKey, Long> TRUNCATE_TIMESTAMP_CACHE;

  static {
    BASELINE_ROLLUP_TIMESTAMP_CACHE = CacheBuilder.newBuilder().maximumSize(100000).build();
    TRUNCATE_TIMESTAMP_CACHE = CacheBuilder.newBuilder().maximumSize(100000).build();
  }

  /**
   * Each granularity has a 1 week late window. That means we'll re-run all calculations for the
   * current week iregardless of what day they uploaded data. It also means that a series of job
   * failures auto-run any data they missed so long as monitor doesn't stay broken for an entire
   * week.
   */
  public static int getLateWindowBatches(Granularity granularity, int lateWindowDays) {
    switch (granularity) {
      case daily:
        return lateWindowDays;
      case PT15M:
      case hourly:
        // TODO: Drop to 3month?
        return lateWindowDays * 24;
      case weekly:
        /**
         * Why 7? Weekly is bucketed daily for the target and weekly for the baseline
         *
         * <p>Daily Sliding: Say they run their weekly jobs on Wednesdays for whatever reason.
         * Weekly runs every day at midnight UTC for datasets with new data in the target day (no
         * configuration needed). Target: 1Day (Wed) Baseline: [7 trailing weeks bucketed] - Tues
         */
        return lateWindowDays;
      case monthly:
        return lateWindowDays;
      default:
        throw new IllegalArgumentException("Unaccounted for granularity " + granularity.toString());
    }
  }

  /**
   * At ingestion time we roll up data. The granularity has less to do with the model granularity
   * and more to do with how the org is configured. Basically, pay us more money for more granular
   * data storage.
   */
  public static long truncateByIngestionGranularity(
      IngestionRollupGranularity ingestionGranularity, Long timestamp) {
    if (timestamp == null) {
      return 0l;
    }
    switch (ingestionGranularity) {
      case hourly:
        // Standard flow for hourly/daily/weekly/monthly datasets
        return truncateTimestamp(timestamp, Granularity.hourly);
      case daily:
        // Standard flow for hourly/daily/weekly/monthly datasets
        return truncateTimestamp(timestamp, Granularity.daily);
      case PT15M:
        // Special flow if enabled on the account
        return truncateTimestamp(timestamp, Granularity.PT15M);
      default:
        log.error("Unimplemented ingestion granularity {}", ingestionGranularity);
        return truncateTimestamp(timestamp, Granularity.hourly);
    }
  }

  @SneakyThrows
  public static long truncateTimestamp(long currentTime, Granularity granularity) {
    val cacheKey = new CacheKey(currentTime, granularity);

    return TRUNCATE_TIMESTAMP_CACHE.get(
        cacheKey,
        new Callable<Long>() {
          @Override
          public Long call() throws Exception {
            return truncateTimestamp(
                    ZonedDateTime.ofInstant(Instant.ofEpochMilli(currentTime), ZoneOffset.UTC),
                    granularity)
                .toInstant()
                .toEpochMilli();
          }
        });
  }

  // TODO: Faster
  public static ZonedDateTime truncateTimestamp(
      ZonedDateTime currentTime, Granularity granularity) {
    if (granularity.equals(Granularity.monthly)) {
      // Java throws an error if you try to truncate to months
      val truncated = currentTime.withDayOfMonth(1).truncatedTo(ChronoUnit.DAYS);
      return truncated;
    } else if (granularity.equals(Granularity.weekly)) {
      // Java throws an error if you try to truncate to weeks
      val truncated =
          currentTime
              .minusDays(currentTime.getDayOfWeek().getValue() - 1)
              .truncatedTo(ChronoUnit.DAYS);
      return truncated;
    } else if (granularity.equals(Granularity.daily)) {
      return currentTime.truncatedTo(ChronoUnit.DAYS);
    } else if (granularity.equals(Granularity.hourly)) {
      return currentTime.truncatedTo(ChronoUnit.HOURS);
    } else if (granularity.equals(Granularity.PT15M)) {
      return currentTime
          .truncatedTo(ChronoUnit.HOURS)
          .plusMinutes(15 * (currentTime.getMinute() / 15));
    } else if (granularity.equals(Granularity.individual)) {
      return currentTime.truncatedTo(ChronoUnit.MILLIS);
    }
    throw new IllegalArgumentException("Unsupported Granularity" + granularity);
  }

  /**
   * Anchored by the targetBatchTimestamp roll up a recordTs to the model granularity for a
   * baseline. For weekly that means it will be one of the weeks leading up to targetBatchTimestamp.
   */
  @SneakyThrows
  public static long getBaselineRollupTimestamp(
      DayOfWeek weekOrigin, final long recordTs, final Granularity granularity) {
    return getBaselineRollupTime(weekOrigin, recordTs, granularity).toInstant().toEpochMilli();
  }

  @SneakyThrows
  public static ZonedDateTime getBaselineRollupTime(
      DayOfWeek weekOrigin, final long recordTs, final Granularity granularity) {
    if (granularity.equals(Granularity.weekly)) {
      final ZonedDateTime recordTimestamp =
          ZonedDateTime.ofInstant(Instant.ofEpochMilli(recordTs), ZoneOffset.UTC);
      int offset = 0;
      if (recordTimestamp.getDayOfWeek().getValue() > weekOrigin.getValue()) {
        offset = recordTimestamp.getDayOfWeek().getValue() - weekOrigin.getValue();
      } else if (recordTimestamp.getDayOfWeek().getValue() < weekOrigin.getValue()) {
        offset = 7 - (weekOrigin.getValue() - recordTimestamp.getDayOfWeek().getValue());
      }

      // Java doesn't let you truncate to WEEKS
      return recordTimestamp.minusDays(offset).truncatedTo(ChronoUnit.DAYS);
    } else {
      val cacheKey = new CacheKey(recordTs, granularity);
      return BASELINE_ROLLUP_TIMESTAMP_CACHE.get(
          cacheKey,
          new Callable<ZonedDateTime>() {
            @Override
            public ZonedDateTime call() {
              ZonedDateTime recordTimestamp =
                  ZonedDateTime.ofInstant(Instant.ofEpochMilli(recordTs), ZoneOffset.UTC);
              return ComputeJobGranularities.truncateTimestamp(recordTimestamp, granularity);
            }
          });
    }
  }

  /**
   * Of all backfill grace period durations in a dataset config, which one's the longest
   *
   * @param monitorConfigV3
   * @return
   */
  public static Duration getLargestDuration(MonitorConfigV3 monitorConfigV3) {
    Duration largestDuration = null;
    for (val a : monitorConfigV3.getAnalyzers()) {
      if (a.getBackfillGracePeriodDuration() == null) {
        continue;
      }
      if (largestDuration == null) {
        largestDuration = a.getBackfillGracePeriodDuration();
      }
      if (a.getBackfillGracePeriodDuration().compareTo(largestDuration) > 0) {
        largestDuration = a.getBackfillGracePeriodDuration();
      }
    }
    return largestDuration;
  }

  public static ZonedDateTime subtract(ZonedDateTime d, Granularity granularity, long amount) {
    switch (granularity) {
      case monthly:
        return d.minusMonths(amount).withDayOfMonth(1);
      case weekly:
        return d.minusWeeks(amount);
      case daily:
        return d.minusDays(amount);
      case hourly:
        return d.minusHours(amount);
      case PT15M:
        return d.minusMinutes(amount);
    }
    throw new IllegalArgumentException("Unsupported granularity " + granularity);
  }

  public static ZonedDateTime add(ZonedDateTime d, Granularity granularity, long amount) {
    switch (granularity) {
      case monthly:
        return d.plusMonths(amount).withDayOfMonth(1);
      case weekly:
        return d.plusWeeks(amount);
      case daily:
        return d.plusDays(amount);
      case hourly:
        return d.plusHours(amount);
      case PT15M:
        return d.plusMinutes(amount);
      case individual:
        return d.plus(1, ChronoUnit.MILLIS);
    }
    throw new IllegalArgumentException("Unsupported granularity " + granularity);
  }
}
