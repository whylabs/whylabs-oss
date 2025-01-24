CREATE TABLE IF NOT EXISTS whylabs.pg_monitor_schedule (
    id BIGSERIAL PRIMARY KEY,
    org_id text not null,
    dataset_id text  not null,
    target_bucket timestamptz  not null,
    eligable_to_run timestamptz  not null,
    analyzer_id text,
    last_initiated timestamptz,
    backfill_interval text not null,
    analyzer_config jsonb not null,
    last_status adhoc_async_status_enum,
    last_updated timestamptz,
    granularity granularity_enum,
    unique (org_id, dataset_id, analyzer_id)
);

-- Each row's gonna be upserted over & over & over. Keep some space in the 8k block
-- for faster upserts but more importantly reduced row lock contention
ALTER TABLE whylabs.pg_monitor_schedule SET (fillfactor = 15);

alter table whylabs.adhoc_async_requests add column pg_monitor_schedule_id bigint;
alter table whylabs.adhoc_async_requests add column eligable_to_run timestamptz;
alter table whylabs.adhoc_async_requests add column num_attempts integer;
alter table whylabs.adhoc_async_requests add column analyzer_id text;

CREATE INDEX active_async_requests_idx ON whylabs.adhoc_async_requests (status, eligable_to_run) where status in ('PENDING',
                                                                                                 'PLANNING',
                                                                                                 'EXECUTING');

CREATE OR REPLACE FUNCTION update_pg_monitor_schedule_status()
    RETURNS trigger
    LANGUAGE plpgsql AS
$func$
BEGIN
    update whylabs.pg_monitor_schedule set last_status = NEW.status, last_updated = now()
        where org_id = NEW.org_id and dataset_id = NEW.dataset_id and analyzer_id = NEW.analyzer_id;
    RETURN NEW;
END
$func$;

CREATE TRIGGER sync_last_status_pg_monitor_update
    AFTER UPDATE ON whylabs.adhoc_async_requests
    FOR EACH ROW
EXECUTE FUNCTION update_pg_monitor_schedule_status();

CREATE TRIGGER sync_last_status_pg_monitor_insert
    AFTER INSERT ON whylabs.adhoc_async_requests
    FOR EACH ROW
EXECUTE FUNCTION update_pg_monitor_schedule_status();


alter type adhoc_async_destination_enum add value 'ANALYSIS_HYPERTABLES_PG';

-- The PG backed monitor will sink to different analyzer tables so we can compare results side by side vs spark
CREATE TABLE IF NOT EXISTS whylabs.analysis_non_anomalies_pg
(
    like whylabs.analysis_non_anomalies including all
);

CREATE TABLE IF NOT EXISTS whylabs.analysis_anomalies_pg
(
    like whylabs.analysis_anomalies including all
);

-- View that unions anomaly table with the non-anomalies for when you want to query both
create view whylabs.analysis_pg as select * from whylabs.analysis_anomalies_pg union all select * from whylabs.analysis_non_anomalies_pg;

-- Time sharded hyper tables!
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;
SELECT create_hypertable('whylabs.analysis_non_anomalies_pg', 'dataset_timestamp', chunk_time_interval => interval '7 day', create_default_indexes => FALSE);
SELECT create_hypertable('whylabs.analysis_anomalies_pg','dataset_timestamp', chunk_time_interval => interval '7 day', create_default_indexes => FALSE);

-- Each workload is queued separately so they're easily prioritized
CREATE TYPE async_analysis_queue AS ENUM ('on_demand', 'scheduled', 'backfill');
alter table whylabs.adhoc_async_requests add queue async_analysis_queue;
alter table whylabs.adhoc_async_requests add failure_message text;

-- Life in the slow lane, backfills are queue'd separate
CREATE TABLE if not exists whylabs.adhoc_async_analysis_queue_backfill (
                                                                  id                          bigserial PRIMARY KEY,
                                                                  run_id     uuid,
                                                                  column_name                 text,
                                                                  segments                   jsonb
);

-- Scheduled work on its own queue
CREATE TABLE if not exists whylabs.adhoc_async_analysis_queue_scheduled (
                                                                  id                          bigserial PRIMARY KEY,
                                                                  run_id     uuid,
                                                                  column_name                 text,
                                                                  segments                   jsonb
);

-- Global switches to flip on/off parts of the scheduler

alter table whylabs.global_system add monitor_scheduler_enabled boolean default false;
alter table whylabs.global_system add monitor_work_dispatcher_enabled boolean default true;

COMMENT ON COLUMN whylabs.global_system.monitor_scheduler_enabled IS 'Automatically queue up work and advance monitor schedules';
COMMENT ON COLUMN whylabs.global_system.monitor_work_dispatcher_enabled IS 'Enable de-queueing monitor work from the queue. This is your kill switch if we overwhelm the database.';