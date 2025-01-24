package ai.whylabs.core.granularity;

import ai.whylabs.core.configV3.structure.TimeRange;
import ai.whylabs.core.configV3.structure.enums.Granularity;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.time.temporal.ChronoUnit;
import lombok.val;
import org.apache.commons.lang.NotImplementedException;

public class TrailingWindowCalculator {
  public static Long getNumBucketsBetween(Granularity granularity, TimeRange timeRange) {
    switch (granularity) {
      case PT15M:
        return ChronoUnit.MINUTES.between(
                Instant.ofEpochMilli(timeRange.getGte()), Instant.ofEpochMilli(timeRange.getLt()))
            / 15;
      case daily:
        return ChronoUnit.DAYS.between(
            Instant.ofEpochMilli(timeRange.getGte()), Instant.ofEpochMilli(timeRange.getLt()));
      case hourly:
        return ChronoUnit.HOURS.between(
            Instant.ofEpochMilli(timeRange.getGte()), Instant.ofEpochMilli(timeRange.getLt()));
      case weekly:
        return ChronoUnit.DAYS.between(
                Instant.ofEpochMilli(timeRange.getGte()), Instant.ofEpochMilli(timeRange.getLt()))
            / 7;
      case monthly:
        val gte = ZonedDateTime.ofInstant(Instant.ofEpochMilli(timeRange.getGte()), ZoneOffset.UTC);
        val lt = ZonedDateTime.ofInstant(Instant.ofEpochMilli(timeRange.getLt()), ZoneOffset.UTC);
        val gteYearMonth = gte.getYear() * 12 + gte.getMonthValue();
        val ltYearMonth = lt.getYear() * 12 + lt.getMonthValue();

        return new Long(ltYearMonth - gteYearMonth);
      default:
        throw new NotImplementedException(granularity + " unsupported");
    }
  }
}
