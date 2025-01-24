CREATE TABLE IF NOT EXISTS whylabs.profiles_unmerged_hypertable
(
    like whylabs.profiles_segmented_hypertable including all
);


SELECT create_hypertable('whylabs.profiles_unmerged_hypertable','dataset_timestamp', chunk_time_interval => interval '7 day', create_default_indexes => FALSE, if_not_exists => TRUE);

-- GE contract has 365 retention fyi. To extend this we'll wanna implement a per-org data retention mechanism
SELECT add_retention_policy('whylabs.profiles_unmerged_hypertable', INTERVAL '365 days', if_not_exists => TRUE);