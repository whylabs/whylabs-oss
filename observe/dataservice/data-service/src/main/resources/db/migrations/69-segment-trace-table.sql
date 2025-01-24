-- Table to look up traces for a segment in a time period

CREATE TABLE IF NOT EXISTS whylabs.segment_traces (
                                                             id bigserial,
                                                             org_id varchar NOT NULL,
                                                             dataset_id varchar NOT NULL,
                                                             segment_tags                jsonb,
                                                             dataset_timestamp           timestamptz not null,
                                                             trace_id                    text not null
);

SELECT create_hypertable('whylabs.segment_traces', 'dataset_timestamp', chunk_time_interval => interval '7 day', create_default_indexes => FALSE, if_not_exists => TRUE);

CREATE INDEX IF NOT EXISTS segment_traces_idx
    ON whylabs.segment_traces USING gin (org_id, dataset_id, segment_tags);

CREATE INDEX IF NOT EXISTS segment_traces_btree_idx
    ON whylabs.segment_traces (org_id, dataset_id) include (segment_tags);


-- GE contract has 365 retention fyi. To extend this we'll wanna implement a per-org data retention mechanism
SELECT add_retention_policy('whylabs.segment_traces', INTERVAL '365 days', if_not_exists => TRUE);