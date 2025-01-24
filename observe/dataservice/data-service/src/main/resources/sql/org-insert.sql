INSERT INTO whylabs.orgs(org_id, data_retention_days, enable_granular_data_storage, ingestion_granularity)
             VALUES (?, ?, ?, ?) on conflict(org_id) do update set
data_retention_days = coalesce(excluded.data_retention_days, orgs.data_retention_days),
enable_granular_data_storage = coalesce(excluded.enable_granular_data_storage, orgs.enable_granular_data_storage),
ingestion_granularity = coalesce(excluded.ingestion_granularity, orgs.ingestion_granularity) returning id;