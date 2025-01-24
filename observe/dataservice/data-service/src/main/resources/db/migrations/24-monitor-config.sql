create table whylabs.monitor_config
(
    id bigserial,
    org_id                 varchar                                                                 not null,
    dataset_id             varchar                                                                 not null,
    json_conf           jsonb,
    updated_ts      timestamp with time zone                                                not null                                                          not null
);

CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;
SELECT create_hypertable('whylabs.monitor_config','updated_ts', chunk_time_interval => interval '7 day', create_default_indexes => FALSE);

create index monitor_config_idx
    on whylabs.monitor_config (org_id, dataset_id, updated_ts);
