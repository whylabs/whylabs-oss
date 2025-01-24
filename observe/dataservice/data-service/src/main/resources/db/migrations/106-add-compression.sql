-- Important note: We're launching the pg_cron backed flow separately. That needs to be stable enough that we
-- know we don't wanna roll back before we commit to flipping this on. See liquibase-changelog and uncomment when
-- ready

-- Enable compression on old data
ALTER TABLE whylabs.profiles_segmented_hypertable SET (timescaledb.compress,timescaledb.compress_segmentby = 'org_id, dataset_id, segment_text',timescaledb.compress_orderby = 'column_name, metric_path, dataset_timestamp desc');
ALTER TABLE whylabs.profiles_overall_hypertable SET (timescaledb.compress,timescaledb.compress_segmentby = 'org_id, dataset_id',timescaledb.compress_orderby = 'column_name, metric_path, dataset_timestamp desc');

-- Set compression policy. Default here was chosen b/c there's a 90d option in the date picker. Older data will occasionally be un-queryable due to data compression further down
SELECT add_compression_policy('whylabs.profiles_segmented_hypertable', compress_after => INTERVAL '99d');
SELECT add_compression_policy('whylabs.profiles_overall_hypertable', compress_after => INTERVAL '99d');
