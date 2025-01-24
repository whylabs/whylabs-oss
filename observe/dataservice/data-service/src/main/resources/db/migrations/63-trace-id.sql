-- Fortunately if you don't default the value these statements don't trigger tuple rewrites
alter table whylabs.profiles_overall_hypertable add column if not exists trace_id text;
alter table whylabs.profiles_overall_staging add column if not exists trace_id text;
alter table whylabs.profiles_segmented_hypertable add column if not exists trace_id text;
alter table whylabs.profiles_segmented_staging add column if not exists trace_id text;
alter table whylabs.profiles_unmerged_hypertable add column if not exists trace_id text;
alter table whylabs.reference_profiles add column if not exists trace_id text;

-- We only care about profile_id on the profiles_unmerged_hypertable, but we keep the schemas aligned across the tables for sanity sake
-- Profile Id is an md5 of the s3 filename
alter table whylabs.profiles_overall_hypertable add column if not exists profile_id Numeric;
alter table whylabs.profiles_overall_staging add column if not exists profile_id Numeric;
alter table whylabs.profiles_segmented_hypertable add column if not exists profile_id Numeric;
alter table whylabs.profiles_segmented_staging add column if not exists profile_id Numeric;
alter table whylabs.profiles_unmerged_hypertable add column if not exists profile_id Numeric;
alter table whylabs.reference_profiles add column if not exists profile_id Numeric;


-- TODO: Update the bulk load scripts if we ever want to wipe/re-ingest from deltalake instead of PG backups

CREATE INDEX IF NOT EXISTS trace_id_idx ON whylabs.profiles_unmerged_hypertable USING gin
        (org_id, dataset_id, trace_id, column_name);
--WITH (timescaledb.transaction_per_chunk);


CREATE INDEX IF NOT EXISTS debug_events_trace_id_idx
    ON whylabs.debug_events USING gin (org_id, dataset_id, trace_id);

create or replace view whylabs.profiles_segmented as select * from whylabs.profiles_segmented_staging union all select * from whylabs.profiles_segmented_hypertable;
create or replace view whylabs.profiles_overall as select * from whylabs.profiles_overall_staging union all select * from whylabs.profiles_overall_hypertable;
