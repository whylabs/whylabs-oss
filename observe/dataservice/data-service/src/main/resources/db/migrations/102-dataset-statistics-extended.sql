CREATE MATERIALIZED VIEW whylabs.dataset_statistics_rollup_2d WITH (timescaledb.continuous) AS
SELECT time_bucket(INTERVAL '1 hours', ingest_timestamp) AS bucket, org_id, dataset_id, count(*) as profile_uploads
FROM whylabs.dataset_statistics
GROUP BY org_id, dataset_id, bucket WITH NO DATA;

-- Refresh pretty aggressively
SELECT add_continuous_aggregate_policy('whylabs.dataset_statistics_rollup_2d',
                                       start_offset => INTERVAL '1 month',
                                       end_offset => null,
                                       schedule_interval => INTERVAL '5 m');


CREATE INDEX IF NOT EXISTS dataset_statistics_rollup2d_idx ON whylabs.dataset_statistics_rollup_2d(org_id, dataset_id);


