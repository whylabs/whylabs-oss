
--
-- The way timescaledb continuous aggs work is you agg everything but the most recent bucket and
-- it aggregates historical buckets against the rollup and bridges to the raw data for rollup. That
-- would work better if our time partitioning were upload timestamp rather than dataset timestamp.
-- Given that uploading to older buckets is our main flow and we partition by customer's dataset
-- timestamp, updating the aggregates on that would be a scheduled process. Eventually consistency issues aside
-- refreshing aggregates in timescaledb is single threaded putting a hard cap on ingestion throughput. There's
-- little visibility when a rollup refresh is running behind nor documentation around what happens when cron
-- schedules overlap. SO...
--
-- We've rolled our own rollup table. Its not as automagic as timescaledb, but ingestion can be multithreaded
-- and avoids the eventual consistency issues.
--
-- Note: Timeseries queries ignore reference profile data
-- Note: Initial rollout requires running backfill_profile_timeseries_table.sql

CREATE TABLE IF NOT EXISTS whylabs.profile_timeseries (
                                                       id serial PRIMARY KEY,
                                                       org_id varchar NOT NULL,
                                                       dataset_id varchar NOT NULL,
                                                       dataset_timestamp timestamptz NOT NULL,
                                                       UNIQUE (org_id, dataset_id, dataset_timestamp)
);


CREATE INDEX IF NOT EXISTS timeseries_idx ON whylabs.profile_timeseries (org_id, dataset_id, dataset_timestamp);

CREATE OR REPLACE FUNCTION backfillTimeseries(gte date) RETURNS varchar LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO whylabs.profile_timeseries (
        org_id, dataset_id, dataset_timestamp   )
        select d.org_id, d.dataset_id, date_trunc('hour', d.dataset_timestamp AT TIME ZONE 'UTC') as timestamp
        from whylabs.profiles_all d where d.dataset_timestamp >= gte and d.dataset_timestamp < gte + INTERVAL '1 days'
        group by org_id, dataset_id, timestamp
    ON CONFLICT DO NOTHING;
    RETURN null;
END $$;
