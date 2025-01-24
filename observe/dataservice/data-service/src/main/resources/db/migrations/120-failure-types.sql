ALTER TYPE failure_type add value if not exists 'unknown_metric';

alter table whylabs.adhoc_async_requests drop column write_tasks;
alter table whylabs.adhoc_async_requests drop column write_tasks_complete;