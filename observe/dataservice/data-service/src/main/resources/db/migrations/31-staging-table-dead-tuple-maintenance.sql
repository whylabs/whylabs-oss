-- Every hour data is promoted from staging tables to the historical tables. For example
-- profiles_segmented_staging => profiles_segmented_hypertable
--
-- The deleted tuples from the staging tables will never get cleaned up. We could do a vacuume, but there
-- are a ton of nuances/caveats with that. Much easier to let timescaledb drop old chunks with a retention policy.

SELECT create_hypertable('whylabs.profiles_segmented_staging','last_upload_ts', chunk_time_interval => interval '1 day', create_default_indexes => FALSE, migrate_data=> TRUE);
SELECT create_hypertable('whylabs.profiles_overall_staging','last_upload_ts', chunk_time_interval => interval '1 day', create_default_indexes => FALSE, migrate_data=> TRUE);

-- We could tighten this up, but 7d gives the promotion process a chance to be broken for a full week before we
-- start clipping data
SELECT add_retention_policy('whylabs.profiles_segmented_staging', INTERVAL '7 days');
SELECT add_retention_policy('whylabs.profiles_overall_staging', INTERVAL '7 days');