
alter table whylabs.profile_upload_audit add column ingest_start_ts timestamptz;
alter table whylabs.profile_upload_audit add column event_ts timestamptz;

