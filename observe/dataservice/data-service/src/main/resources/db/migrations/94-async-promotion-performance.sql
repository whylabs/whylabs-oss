alter table whylabs.adhoc_async_promotion_queue add column if not exists backfill_interval text;
alter table whylabs.adhoc_async_requests add column if not exists write_tasks numeric;
alter table whylabs.adhoc_async_requests add column if not exists write_tasks_complete numeric;

CREATE INDEX  promotion_adhoc_index ON whylabs.analysis_adhoc (run_id, dataset_timestamp, analysis_id);