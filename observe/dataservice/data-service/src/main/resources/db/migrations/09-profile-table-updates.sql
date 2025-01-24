-- Used for bulk loading parquet dumps
create server if not exists parquet_srv foreign data wrapper parquet_fdw;
create user mapping IF NOT EXISTS for CURRENT_USER server parquet_srv options (user 'postgres');

-- Decided to drop the foreign key
alter table whylabs.whylogs_profiles_v1 drop column upload_audit;
alter table whylabs.reference_profiles drop column upload_audit;

alter table whylabs.reference_profiles add column reference_profile_id text;
alter table whylabs.whylogs_profiles_v1 add column last_upload_ts timestamptz;
alter table whylabs.whylogs_profiles_v1 add column first_upload_ts timestamptz;

-- First vs last are irrelevant for ref profiles which get a single upload
-- but keeping it aligned with the main table for simplicity
alter table whylabs.reference_profiles add column last_upload_ts timestamptz;
alter table whylabs.reference_profiles add column first_upload_ts timestamptz;
