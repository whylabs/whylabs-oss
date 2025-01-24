-- Add some fields so we can mimic the old analyzer runs table somewhat

alter table whylabs.adhoc_async_requests add column if not exists anomalies numeric;
alter table whylabs.adhoc_async_requests add column if not exists analyzer_type text;
alter table whylabs.adhoc_async_requests add column if not exists monitor_id text;

alter table whylabs.pg_monitor_schedule add column if not exists analyzer_type text;
alter table whylabs.pg_monitor_schedule add column if not exists monitor_id text;


