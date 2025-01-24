CREATE TABLE IF NOT EXISTS whylabs.analysis_adhoc
(
    like whylabs.analysis_anomalies including all
);

SELECT create_hypertable('whylabs.analysis_adhoc','dataset_timestamp', chunk_time_interval => interval '1 hour', create_default_indexes => FALSE);

create index analysis_adhoc_time_idx
    on whylabs.analysis_adhoc (org_id, dataset_id, run_id, analyzer_id, dataset_timestamp);

-- Purge aggressively as adhoc results are ephemeral in nature
SELECT add_retention_policy('whylabs.analysis_adhoc', INTERVAL '24 hours');

-- Drop the old tables, they've been swapped out for hyper tables and views
drop table whylabs.whylogs_analyzer_results cascade;
drop table whylabs.whylogs_profiles_v1  cascade;