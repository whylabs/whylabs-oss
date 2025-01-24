CREATE TABLE IF NOT EXISTS whylabs.customer_events (
    id BIGSERIAL PRIMARY KEY,
    org_id TEXT,
    dataset_id TEXT,
    user_id TEXT,
    event_type TEXT,
    event_timestamp TIMESTAMP,
    description TEXT,
    UNIQUE(org_id, dataset_id, user_id, event_type, event_timestamp)
);

CREATE INDEX IF NOT EXISTS customer_event_idx ON whylabs.customer_events(org_id, dataset_id, event_timestamp);