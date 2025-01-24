package ai.whylabs.core.enums;

/**
 * The standard flow into tables like profiles_overall_hypertable and the profile datalake
 * auto-merge data up to the hour unless otherwise specified by this enum.
 *
 * <p>Notable that daily/weekly/monthly models all ingest to an hourly rollup. That may change in
 * the future, just noting that it's not 1:1 with model granularity at the time of writing or we
 * would re-use that enum.
 */
public enum IngestionRollupGranularity {
  hourly,
  daily,
  PT15M
}
