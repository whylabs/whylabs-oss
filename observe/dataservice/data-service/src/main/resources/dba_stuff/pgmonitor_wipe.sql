-- Wipes schedules
truncate whylabs.pg_monitor_schedule;

-- Wipe what's roughly ~analyzer_runs v2
delete from whylabs.adhoc_async_requests where destination = 'ANALYSIS_HYPERTABLES_PG';

--Wipe worker Queues
truncate whylabs.adhoc_async_analysis_queue_backfill;
truncate whylabs.adhoc_async_analysis_queue_scheduled;
truncate whylabs.adhoc_async_analysis_queue;

-- Wipe analyzer results from PG tables
truncate whylabs.analysis_anomalies_pg;
truncate whylabs.analysis_non_anomalies_pg;

-- Wipe what's roughly ~analyzer_runs v2
delete from whylabs.adhoc_async_requests where status = 'PENDING' and queue = 'scheduled';
