-- Catching the exception here makes type creation idempotent
DO $$ BEGIN
    create type ingestion_rollup_granularity_enum as enum ('hourly', 'PT15M');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

alter table whylabs.orgs add column IF NOT EXISTS ingestion_granularity ingestion_rollup_granularity_enum default 'hourly';