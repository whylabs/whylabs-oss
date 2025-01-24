-- This table provides a super fast lookup to retrieve the latest config out of the versioned monitor config table.

CREATE TABLE IF NOT EXISTS whylabs.monitor_config_latest (
                                                             id bigserial PRIMARY KEY,
                                                             monitor_config_id bigserial,
                                                             org_id varchar NOT NULL,
                                                             dataset_id varchar NOT NULL,
                                                             version numeric,
                                                             unique (org_id, dataset_id)
);

-- Backfill the latest table with the data that's already there
with datasets as (
    select id, org_id, dataset_id, json_conf, json_conf->'metadata'->>'version' version from whylabs.monitor_config
),
latest_configs as (
    select distinct on (org_id, dataset_id) datasets.* from datasets
    where version is not null
    order by org_id, dataset_id, version desc
)
insert into whylabs.monitor_config_latest(monitor_config_id, org_id, dataset_id, version)
select id, org_id, dataset_id, version::numeric from latest_configs
on conflict(org_id, dataset_id) do update
    set id = excluded.id, version = excluded.version
    where excluded.version > monitor_config_latest.version
;

