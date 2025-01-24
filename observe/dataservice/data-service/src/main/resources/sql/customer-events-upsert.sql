INSERT INTO whylabs.customer_events (org_id, dataset_id, user_id, event_type, event_timestamp, description) values (?, ?, ?, ?, ?, ?)
ON CONFLICT (org_id, dataset_id, user_id, event_type, event_timestamp) DO UPDATE SET
    description = COALESCE(excluded.description, customer_events.description)
RETURNING id;