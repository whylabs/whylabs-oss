CREATE TABLE IF NOT EXISTS whylabs.pg_monitor_late_data_queue (
                                                            org_id varchar NOT NULL,
                                                            dataset_id varchar NOT NULL,
                                                            dataset_timestamp timestamptz NOT NULL,
                                                            ingest_timestamp timestamptz NOT NULL,
                                                            analyzer_id text not null,
                                                            unique (org_id, dataset_id, dataset_timestamp, analyzer_id, ingest_timestamp)
);

-- Having timescaledb chunk by ingest_timestamp lets us delete older data without any lock contention with newly arriving data
SELECT create_hypertable('whylabs.pg_monitor_late_data_queue','ingest_timestamp', chunk_time_interval => interval '1 hour', create_default_indexes => FALSE);

SELECT add_retention_policy('whylabs.pg_monitor_late_data_queue', INTERVAL '3 days', if_not_exists => TRUE);

-- Targeting pg-monitor-get-late-data-cutoff.sql for this one. Being on the ingest pathway we want this to be fast even when the table gets big
CREATE INDEX active_org_dataset_async_requests_idx ON whylabs.adhoc_async_requests (org_id, dataset_id, status, eligable_to_run) where status in ('PENDING',
                                                                                                                                                  'PLANNING', 'EXECUTING');
ALTER TYPE failure_type add value if not exists 'query_planning_failure';