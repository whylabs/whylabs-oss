package ai.whylabs.dataservice.enums;

import ai.whylabs.core.configV3.structure.enums.Granularity;
import java.time.Duration;
import java.util.Optional;

public enum DataGranularity {
  individual(Granularity.hourly, "microseconds", "1 microseconds", Duration.ofMillis(1)),
  PT15M(Granularity.PT15M, "hour", "15 minutes", Duration.ofMinutes(15)),
  hourly(Granularity.hourly, "hour", "1 hour", Duration.ofHours(1)),
  daily(Granularity.daily, "day", "1 day", Duration.ofDays(1)),
  weekly(Granularity.weekly, "week", "1 week", Duration.ofDays(7)),
  monthly(Granularity.monthly, "month", "1 month", Duration.ofDays(30)),
  all(null, "millennium", "99 years", Duration.ofDays(36135)),
  ;

  private final Granularity granularity;
  private final String sql;
  private final String tsGranularity;
  private final Duration duration; // for kusto query language

  public Granularity asMonitorGranularity() {
    return Optional.ofNullable(granularity) //
        .orElseThrow(
            () ->
                new IllegalArgumentException(
                    "Granularity " + this + " is not a supported monitoring granularity"));
  }
  ;

  /** convert from internal granularity to Postgres precision for date_trunc function. */
  public String asSQL() {
    return Optional.ofNullable(sql) //
        .orElseThrow(
            () ->
                new IllegalArgumentException(
                    "Granularity " + this + " is not a supported SQL granularity"));
  }

  public Duration asDuration() {
    return Optional.ofNullable(duration) //
        .orElseThrow(
            () ->
                new IllegalArgumentException(
                    "Granularity " + this + " is not a supported duration granularity"));
  }

  public String asTimescaleGranularity() {
    return Optional.ofNullable(tsGranularity) //
        .orElseThrow(
            () ->
                new IllegalArgumentException(
                    "Granularity " + this + " is not a supported TimescaleDB granularity"));
  }

  DataGranularity(
      Granularity monitorGranularity, String sql, String tsGranularity, Duration duration) {
    this.granularity = monitorGranularity;
    this.sql = sql;
    this.tsGranularity = tsGranularity;
    this.duration = duration;
  }
}
