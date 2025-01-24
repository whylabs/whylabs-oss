CREATE TABLE IF NOT EXISTS whylabs.max_io_cache (
                                                    id bigserial,
                                                    org_id text not null,
                                                    dataset_id text not null,
                                                    segment_text jsonb,
                                                    dataset_timestamp timestamptz NOT NULL,
                                                    updated_timestamp timestamptz NOT NULL,
                                                    is_output bool,
                                                    max_count bigint,
                                                    unique (org_id, dataset_id, segment_text, dataset_timestamp, is_output)
) ;

CREATE INDEX IF NOT EXISTS max_io_cache_idx
    ON whylabs.max_io_cache USING gin (org_id, dataset_id, segment_text);

SELECT create_hypertable('whylabs.max_io_cache','dataset_timestamp', chunk_time_interval => interval '7 day', create_default_indexes => FALSE, if_not_exists => TRUE);