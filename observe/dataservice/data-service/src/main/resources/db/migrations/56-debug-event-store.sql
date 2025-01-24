--drop table if exists whylabs.debug_events;

CREATE TABLE if not exists whylabs.debug_events (
                                                    id                          bigserial,
                                                    dataset_id                  text,
                                                    org_id                      text,
                                                    segment_tags                jsonb,
                                                    content                     jsonb,
                                                    creation_timestamp          timestamptz,
                                                    dataset_timestamp           timestamptz not null,
                                                    trace_id                    text,
                                                    tags                        jsonb

);

COMMENT ON COLUMN whylabs.debug_events.tags IS 'Customer supplied tags';
COMMENT ON COLUMN whylabs.debug_events.trace_id IS 'Trace ID used to correlate with specific unmerged profile records';

CREATE INDEX IF NOT EXISTS debug_events_idx
    ON whylabs.debug_events USING gin (org_id, dataset_id, segment_tags);

SELECT create_hypertable('whylabs.debug_events', 'dataset_timestamp', chunk_time_interval => interval '7 day', create_default_indexes => FALSE, if_not_exists => TRUE);

-- GE contract has 365 retention fyi. To extend this we'll wanna implement a per-org data retention mechanism
SELECT add_retention_policy('whylabs.debug_events', INTERVAL '365 days');