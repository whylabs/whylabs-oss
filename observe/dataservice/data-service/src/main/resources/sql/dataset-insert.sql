INSERT INTO whylabs.datasets(org_id, dataset_id, granularity, ingestion_disabled, name, type, active, created_ts)
VALUES (?, ?, ?, ?, ?, ?, ?, coalesce(?, current_timestamp)) on conflict(org_id, dataset_id) do update set
    granularity = coalesce(excluded.granularity, datasets.granularity),
    ingestion_disabled = coalesce(excluded.ingestion_disabled, datasets.ingestion_disabled),
    name = coalesce(excluded.name, datasets.name),
    type = coalesce(excluded.type, datasets.type),
    active = coalesce(excluded.active, datasets.active),
    created_ts = least(datasets.created_ts, excluded.created_ts),
    last_updated_ts = current_timestamp
    returning id;

