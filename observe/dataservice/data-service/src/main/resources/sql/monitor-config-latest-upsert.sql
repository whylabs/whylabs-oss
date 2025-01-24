-- Bump the version in monitor_config_latest pointing to the latest if the version is in fact newer

insert into whylabs.monitor_config_latest(monitor_config_id, org_id, dataset_id, version, updated_ts)
select id, org_id, dataset_id, (json_conf->'metadata'->>'version')::numeric v, updated_ts from whylabs.monitor_config where id = ? and updated_ts > NOW() - INTERVAL '14 DAY'
        on conflict(org_id, dataset_id) do update
    set monitor_config_id = excluded.monitor_config_id, version = excluded.version, updated_ts = excluded.updated_ts
where monitor_config_latest.version is null or excluded.version >= monitor_config_latest.version;
