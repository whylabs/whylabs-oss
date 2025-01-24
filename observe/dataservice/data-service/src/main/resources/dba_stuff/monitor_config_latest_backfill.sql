-- TODO: Run in prod after next deploy

update whylabs.monitor_config_latest set updated_ts = whylabs.monitor_config.updated_ts   from whylabs.monitor_config
where monitor_config.id = monitor_config_latest.monitor_config_id;