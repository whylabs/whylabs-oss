CREATE INDEX failed_async_requests_idx ON whylabs.adhoc_async_requests (created_timestamp, status, eligable_to_run) where status in ('FAILED');

CREATE INDEX if not exists async_requests_org_dataset_idx ON whylabs.adhoc_async_requests (org_id, dataset_id, analyzer_id, created_timestamp) ;

DO $$ BEGIN
    CREATE TYPE failure_type AS ENUM ('data_unavailable', 'missing_entity_schema');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;


alter table whylabs.adhoc_async_requests add column if not exists failure_type failure_type;