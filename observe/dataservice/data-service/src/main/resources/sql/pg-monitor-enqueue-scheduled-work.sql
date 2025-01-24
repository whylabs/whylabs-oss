-- Grab current datasets with analysis currently in progress
with active as (select org_id, dataset_id, status, analyzer_id from whylabs.adhoc_async_requests where status in ('PENDING',
    'PLANNING',
    'EXECUTING') and queue = 'scheduled'::async_analysis_queue
),
-- Get analyzers eligible to run joined with whether there's any work being ran on said analyzer
joined as (
    select pg_monitor_schedule.id, pg_monitor_schedule.org_id, pg_monitor_schedule.dataset_id, pg_monitor_schedule.analyzer_id, pg_monitor_schedule.target_bucket, status, backfill_interval, analyzer_config, granularity, eligable_to_run, analyzer_type, monitor_id
    from whylabs.pg_monitor_schedule left join active on
        pg_monitor_schedule.dataset_id = active.dataset_id and
        pg_monitor_schedule.org_id = active.org_id and
        pg_monitor_schedule.analyzer_id = active.analyzer_id
    where disabled is null or disabled = false
),
-- Drop out any analyzers currently being ran
filtered as (
    SELECT id, org_id, dataset_id, analyzer_id, backfill_interval, analyzer_config, target_bucket, granularity, eligable_to_run, analyzer_type, monitor_id from joined where status is null and eligable_to_run < now() and target_bucket < now()
),
-- Queue up the work
queued_work as (
    insert into whylabs.adhoc_async_requests (org_id, dataset_id, status, destination, backfill_interval, created_timestamp, updated_timestamp, analyzers_configs, run_id, pg_monitor_schedule_id, eligable_to_run, num_attempts, analyzer_id, queue, analyzer_type, monitor_id)
           select org_id, dataset_id, 'PENDING'::adhoc_async_status_enum, 'ANALYSIS_HYPERTABLES_PG'::adhoc_async_destination_enum, backfill_interval, now(), now(), analyzer_config, gen_random_uuid(), id, eligable_to_run, 0, analyzer_id, 'scheduled'::async_analysis_queue, analyzer_type, monitor_id  from filtered
)
select id, analyzer_config, target_bucket, granularity from filtered;


