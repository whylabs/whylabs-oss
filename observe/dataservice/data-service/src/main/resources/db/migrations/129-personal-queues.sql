-- If you want to debug a dev or prod analyzer its tricky in that your laptop is competing
-- with machines in K8 to dequeue the work. Thus we have a queue user so you can trigger
-- analysis and your laptop gets dibs on de-queueing the work.

alter table whylabs.adhoc_async_analysis_queue add column queue_user text;
alter table whylabs.adhoc_async_analysis_queue_backfill add column queue_user text;
alter table whylabs.adhoc_async_analysis_queue_scheduled add column queue_user text;