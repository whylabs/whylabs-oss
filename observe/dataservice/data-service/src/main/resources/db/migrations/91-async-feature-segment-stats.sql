alter table whylabs.adhoc_async_requests add column if not exists features  numeric;
alter table whylabs.adhoc_async_requests add column if not exists segments  numeric;