
-- table to hold a record of most recently sent immediate digests

CREATE TABLE IF NOT EXISTS whylabs.digests_immediate
(
    id                bigserial,
    org_id            text  NOT NULL,
    dataset_id        text  NOT NULL,
    monitor_id        text  NOT NULL,
    run_id            text  NOT NULL,
    config            jsonb NOT NULL,
    created_timestamp timestamptz NOT NULL,
    sent_timestamp    timestamptz,
    payload           jsonb

);

CREATE TABLE IF NOT EXISTS whylabs.digests_scheduled
(
    id                bigserial,
    org_id            text  NOT NULL,
    dataset_id        text  NOT NULL,
    monitor_id        text  NOT NULL,
    run_id            text  NOT NULL,
    config            jsonb NOT NULL,
    created_timestamp timestamptz NOT NULL,
    sent_timestamp    timestamptz,
    next_fire_ts      timestamptz,
    payload           jsonb
);

SELECT create_hypertable('whylabs.digests_immediate','created_timestamp', chunk_time_interval => interval '7 day', create_default_indexes => FALSE);
SELECT add_retention_policy('whylabs.digests_immediate', INTERVAL '90 days', if_not_exists => TRUE);

SELECT create_hypertable('whylabs.digests_scheduled','created_timestamp', chunk_time_interval => interval '7 day', create_default_indexes => FALSE);
SELECT add_retention_policy('whylabs.digests_scheduled', INTERVAL '90 days', if_not_exists => TRUE);


