-- Schedule jobs via background workers instead of localhost connections

-- Keep the cron job_run_details table tidy
SELECT cron.schedule('0 0 * * *', $$DELETE
    FROM cron.job_run_details
    WHERE end_time < now() - interval '4 hours'$$);


-- New flow has 2 hops Staging=>Staging_silver=>historical
--
-- Why a silver table? When someone onboards a dataset logged distributed or highly segmented then we can have
-- staging data that's too large to merge at query time so we need to be rolling that up every hour. Data
-- wont be rolled up into the historical tables until the weekend.

create table if not exists whylabs.profiles_overall_staging_silver
(
    id bigserial,
    org_id                 text                                                                       not null,
    dataset_id             text                                                                       not null,
    column_name            text,
    metric_path            text,
    segment_text           jsonb,
    dataset_tags           jsonb,
    dataset_timestamp      timestamp with time zone                                                      not null,
    variance               numeric[],
    d_sum                  numeric,
    d_min                  numeric,
    d_max                  numeric,
    unmergeable_d          numeric,
    n_sum                  bigint,
    n_min                  bigint,
    n_max                  bigint,
    dataset_type           dataset_type_enum                                                             not null,
    mergeable_segment      boolean                                                                       not null,
    kll                    kll_double_sketch,
    hll                    hll_sketch,
    frequent_items         frequent_strings_sketch,
    classification_profile bytea,
    regression_profile     bytea,
    last_upload_ts         timestamp with time zone                                                      not null,
    first_upload_ts        timestamp with time zone,
    trace_id               text,
    profile_id             numeric
);

create index if not exists profiles_detailed_overall_silver_staging_idx
    on whylabs.profiles_overall_staging_silver (org_id, dataset_id, column_name, metric_path, dataset_timestamp);

create index if not exists max_io_staging_silver_idx
    on whylabs.profiles_overall_staging_silver (org_id, dataset_id, dataset_timestamp) include (column_name, n_sum)
    where ((metric_path)::text = 'counts/n'::text);

SELECT create_hypertable('whylabs.profiles_overall_staging_silver','last_upload_ts', chunk_time_interval => interval '7 day', create_default_indexes => FALSE, migrate_data=> TRUE);

-- In theory data's being deleted during promotion, but keeping the chunks tidy improves query planning speed and frees up space
SELECT add_retention_policy('whylabs.profiles_overall_staging_silver', INTERVAL '30 days', if_not_exists => TRUE);



create table whylabs.profiles_segmented_staging_silver
(
    id                     bigserial,
    org_id                 text                  not null,
    dataset_id             text                  not null,
    column_name            text,
    metric_path            text,
    segment_text           jsonb,
    dataset_tags           jsonb,
    dataset_timestamp      timestamp with time zone not null,
    variance               numeric[],
    d_sum                  numeric,
    d_min                  numeric,
    d_max                  numeric,
    unmergeable_d          numeric,
    n_sum                  bigint,
    n_min                  bigint,
    n_max                  bigint,
    dataset_type           dataset_type_enum        not null,
    mergeable_segment      boolean                  not null,
    kll                    kll_double_sketch,
    hll                    hll_sketch,
    frequent_items         frequent_strings_sketch,
    classification_profile bytea,
    regression_profile     bytea,
    last_upload_ts         timestamp with time zone not null,
    first_upload_ts        timestamp with time zone,
    trace_id               text,
    profile_id             numeric
);

create index profiles_staging_segmented_siler_org_dataset_col_seg_idx
    on whylabs.profiles_segmented_staging_silver using gin (org_id, dataset_id, column_name, metric_path, dataset_timestamp,
                                                            segment_text jsonb_path_ops);

create index profiles_hypertable_segmented_staging_silver_json
    on whylabs.profiles_segmented_staging_silver using gin (org_id, dataset_id, segment_text, column_name);

create index max_io_segmented_staging_silver_v3_idx
    on whylabs.profiles_segmented_staging_silver (org_id, dataset_id, dataset_timestamp, column_name) include (n_sum, segment_text)
    where ((metric_path)::text = 'counts/n'::text);

create index profiles_segmented_silver_dataset_metric_staging_json
    on whylabs.profiles_segmented_staging_silver using gin (org_id, dataset_id, segment_text, metric_path);

SELECT create_hypertable('whylabs.profiles_segmented_staging_silver','last_upload_ts', chunk_time_interval => interval '7 day', create_default_indexes => FALSE, migrate_data=> TRUE);

-- In theory data's being deleted during promotion, but keeping the chunks tidy improves query planning speed and frees up space
SELECT add_retention_policy('whylabs.profiles_segmented_staging_silver', INTERVAL '30 days', if_not_exists => TRUE);



-- Have to re-create the view after altering underlying column types
drop view whylabs.profiles_all;
drop view whylabs.profiles_segmented;
drop view whylabs.profiles_overall;

-- Details on why you need text instead of varchar https://github.com/timescale/timescaledb/issues/2722#issuecomment-812697206
-- Don't worry, they're stored the same on disk. Doesn't trigger a table rewrite.
ALTER TABLE whylabs.profiles_overall_hypertable ALTER COLUMN org_id TYPE text;
ALTER TABLE whylabs.profiles_overall_hypertable ALTER COLUMN dataset_id TYPE text;
ALTER TABLE whylabs.profiles_overall_hypertable ALTER COLUMN column_name TYPE text;
ALTER TABLE whylabs.profiles_overall_hypertable ALTER COLUMN metric_path TYPE text;

ALTER TABLE whylabs.profiles_segmented_hypertable ALTER COLUMN org_id TYPE text;
ALTER TABLE whylabs.profiles_segmented_hypertable ALTER COLUMN dataset_id TYPE text;
ALTER TABLE whylabs.profiles_segmented_hypertable ALTER COLUMN column_name TYPE text;
ALTER TABLE whylabs.profiles_segmented_hypertable ALTER COLUMN metric_path TYPE text;

-- Recreate views
create or replace view whylabs.profiles_all as select * from whylabs.profiles_segmented_staging union all select * from whylabs.profiles_segmented_hypertable union all select * from whylabs.profiles_overall_staging union all select * from whylabs.profiles_overall_hypertable  union all select * from whylabs.profiles_overall_staging_silver  union all select * from whylabs.profiles_segmented_staging_silver;
create or replace view whylabs.profiles_segmented as select * from whylabs.profiles_segmented_staging union all select * from whylabs.profiles_segmented_hypertable union all select * from whylabs.profiles_segmented_staging_silver;
create or replace view whylabs.profiles_overall as select * from whylabs.profiles_overall_staging union all select * from whylabs.profiles_overall_hypertable union all select * from whylabs.profiles_overall_staging_silver;

--create types
DO $$ BEGIN
    CREATE TYPE system_status AS ENUM ('normal', 'data_promotion_silver_to_historical', 'timescale_compression', 'vacuum');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS whylabs.global_system(
                                                    status system_status default 'normal',
                                                    last_updated_timestamp timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
                                                    data_availability_cutoff      timestamptz,
                                                    pg_cron_flow_enabled boolean default false
);

-- Single record in this table
insert into whylabs.global_system (status) values ('normal');

-- Queue Tables for the different data moving tasks
CREATE TABLE IF NOT EXISTS whylabs.queue_data_promotions_bronze_to_silver (
                                                                              id serial PRIMARY KEY,
                                                                              org_id text NOT NULL,
                                                                              dataset_id text NOT NULL,
                                                                              unique (org_id, dataset_id)
);

CREATE TABLE IF NOT EXISTS whylabs.queue_data_promotions_silver_to_historical (
                                                                                  id serial PRIMARY KEY,
                                                                                  org_id text NOT NULL,
                                                                                  dataset_id text NOT NULL,
                                                                                  unique (org_id, dataset_id)
);

CREATE TABLE IF NOT EXISTS whylabs.queue_timescale_compression (
                                                                   id serial PRIMARY KEY,
                                                                   chunk text NOT NULL,
                                                                   unique (chunk)
);

-- Promote Bronze=>Silver, this is pretty much a lift and ship from promote-overall.sql and promote-segmented.sql
-- into a psql function with some de-queueing from a work queue table ^
CREATE OR REPLACE FUNCTION promoteBronzeToSilverWork() RETURNS boolean AS $$
DECLARE
    dequeued_org_id text;
    dequeued_dataset_id text;
BEGIN
    set jit = off;

    -- Dequeue a dataset to promote
    with dequeued_item as (DELETE FROM  whylabs.queue_data_promotions_bronze_to_silver  WHERE id = any (
        SELECT id FROM whylabs.queue_data_promotions_bronze_to_silver
            FOR UPDATE SKIP LOCKED

        LIMIT 1
    ) RETURNING id, org_id, dataset_id)
    select org_id, dataset_id into dequeued_org_id, dequeued_dataset_id from dequeued_item;

    -- Promote overall
    with deleted as (delete from whylabs.profiles_overall_staging where org_id = dequeued_org_id and dataset_id = dequeued_dataset_id  returning *)
    insert into whylabs.profiles_overall_staging_silver (classification_profile, regression_profile, mergeable_segment, dataset_type, dataset_timestamp, org_id, dataset_id, column_name, metric_path, d_sum, d_min, d_max, n_sum, n_min, n_max, last_upload_ts, first_upload_ts, variance, kll, frequent_items, hll, trace_id)
    with merged as (select
                        mergeable_segment,
                        dataset_type,
                        -- Note: date truncation happens in profileService
                        dataset_timestamp,
                        org_id,
                        dataset_id,
                        column_name,
                        metric_path,
                        -- Multiple traceIds could get rolled up, promote a sample of 1
                        (ARRAY_AGG(trace_id) FILTER (WHERE trace_id IS NOT NULL))[1] as trace_id,
                        -- merging the metrics here
                        sum(d_sum)                                                    as d_sum,
                        min(d_min)                                                    as d_min,
                        max(d_max)                                                    as d_max,
                        sum(n_sum)                                                    as n_sum,
                        min(n_min)                                                    as n_min,
                        max(n_max)                                                    as n_max,
                        max(last_upload_ts)                                          as last_upload_ts,
                        min(first_upload_ts)                                         as first_upload_ts,
                        whylabs.variance_tracker(variance)                            as variance,
                        kll_double_sketch_merge(kll, 1024)                            as kll,
                        classification_merge(classification_profile)                  as classification_profile,
                        regression_merge(regression_profile)                          as regression_profile,
                        frequent_strings_sketch_merge(7, case
                                                             when length(CAST(frequent_items as bytea)) > 8
                                                                 then frequent_items
                            end)                                                      as frequent_items,
                        hll_sketch_union(hll)                                         as hll
                    from deleted
                    where unmergeable_d is null and mergeable_segment != false
                    group by org_id, dataset_id, column_name, dataset_type, dataset_timestamp, metric_path, mergeable_segment)
    -- Unroll the array back into jsonb on the result
    select classification_profile, regression_profile, mergeable_segment, dataset_type, dataset_timestamp, org_id, dataset_id, column_name, metric_path, d_sum, d_min, d_max, n_sum, n_min, n_max, last_upload_ts, first_upload_ts, variance, kll, frequent_items, hll, trace_id from merged
    order by org_id desc, dataset_id desc, column_name desc, dataset_type desc, metric_path desc, dataset_timestamp desc;

    -- Promote Segmented
    with deleted as (delete from whylabs.profiles_segmented_staging where org_id = dequeued_org_id and dataset_id = dequeued_dataset_id  returning *)
    insert into whylabs.profiles_segmented_staging_silver (segment_text, classification_profile, regression_profile, mergeable_segment, dataset_type, dataset_timestamp, org_id, dataset_id, column_name, metric_path, d_sum, d_min, d_max, n_sum, n_min, n_max, last_upload_ts, first_upload_ts, variance, kll, frequent_items, hll, trace_id)

-- Roll up everything we can to the hour
    with merged as (select
                        -- Can't group by jsonb so we have to turn it into an array
                        ARRAY(SELECT jsonb_array_elements_text(segment_text) as s order by 1 asc) as segment_text,
                        mergeable_segment,
                        dataset_type,
                        -- Note: date truncation happens in profileService
                        dataset_timestamp,
                        org_id,
                        dataset_id,
                        column_name,
                        metric_path,
                        -- Multiple traceIds could get rolled up, promote a sample of 1
                        (ARRAY_AGG(trace_id) FILTER (WHERE trace_id IS NOT NULL))[1] as trace_id,
                        -- merging the metrics here
                        sum(d_sum)                                                    as d_sum,
                        min(d_min)                                                    as d_min,
                        max(d_max)                                                    as d_max,
                        sum(n_sum)                                                    as n_sum,
                        min(n_min)                                                    as n_min,
                        max(n_max)                                                    as n_max,
                        max(last_upload_ts)                                          as last_upload_ts,
                        min(first_upload_ts)                                         as first_upload_ts,
                        whylabs.variance_tracker(variance)                            as variance,
                        kll_double_sketch_merge(kll, 1024)                            as kll,
                        classification_merge(classification_profile)                  as classification_profile,
                        regression_merge(regression_profile)                          as regression_profile,
                        frequent_strings_sketch_merge(7, case
                                                             when length(CAST(frequent_items as bytea)) > 8
                                                                 then frequent_items
                            end)                                                      as frequent_items,
                        hll_sketch_union(hll)                                         as hll
                    from deleted
                    where unmergeable_d is null and mergeable_segment != false
                    group by segment_text, org_id, dataset_id, column_name, dataset_type, dataset_timestamp, metric_path, mergeable_segment)
-- Unroll the array back into jsonb on the result
    select array_to_json(segment_text)::jsonb as segment_text, classification_profile, regression_profile, mergeable_segment, dataset_type, dataset_timestamp, org_id, dataset_id, column_name, metric_path, d_sum, d_min, d_max, n_sum, n_min, n_max, last_upload_ts, first_upload_ts, variance, kll, frequent_items, hll, trace_id from merged
    order by org_id desc, dataset_id desc, column_name desc, dataset_type desc, segment_text desc, metric_path desc, dataset_timestamp desc;


    return true;
END;
$$ LANGUAGE plpgsql;

-- schedule add/remove workres via globalstatusservice

-- Function to initiate the data promotion process, queueing up all recently touched datasets for promotion
CREATE OR REPLACE FUNCTION initiateBronzeToSilverDataPromotions() RETURNS boolean AS $$
BEGIN
    if (select status from whylabs.global_system limit 1) = ('data_promotion_silver_to_historical') THEN
        -- Reduce row lock contention by pausing bronze=>silver promotions until silver=>historical have finished. Yes
        -- inserts can have seemingly unrelated contention with deletes because tuples share blocks, btree splits, etc.
        return false;
    end if;

    -- Queue up data promotions for all datasets which have had a recent upload
    with fresh_data as (SELECT org_id, dataset_id FROM "whylabs"."dataset_statistics_rollup_2d" group by org_id, dataset_id),
         a as (insert into whylabs.queue_data_promotions_bronze_to_silver (org_id, dataset_id) select org_id, dataset_id from fresh_data ON CONFLICT (org_id, dataset_id) DO NOTHING )
    insert into whylabs.queue_data_promotions_silver_to_historical (org_id, dataset_id) select org_id, dataset_id from fresh_data ON CONFLICT (org_id, dataset_id) DO NOTHING
    ;
    return true;
END;
$$ LANGUAGE plpgsql;

-- This gets scheduled in globalstatusservice

-- Promote Silver=>Historical, this is pretty much a lift and ship from promote-overall.sql and promote-segmented.sql
-- into a psql function with some de-queueing from a work queue table
CREATE OR REPLACE FUNCTION promoteSilverToHistoricalWork() RETURNS boolean AS $$
DECLARE
    dequeued_org_id text;
    dequeued_dataset_id text;
BEGIN
    set jit = off;
    -- Bail out if the system's not in data promotion status
    if (select status from whylabs.global_system limit 1) != 'data_promotion_silver_to_historical' THEN
        return false;
    end if;

    -- Dequeue a dataset to promote
    with dequeued_item as (DELETE FROM  whylabs.queue_data_promotions_silver_to_historical  WHERE id = any (
        SELECT id FROM whylabs.queue_data_promotions_silver_to_historical
            FOR UPDATE SKIP LOCKED

        LIMIT 1
    ) RETURNING id, org_id, dataset_id)
    select org_id, dataset_id into dequeued_org_id, dequeued_dataset_id from dequeued_item;

    -- Promote overall
    with deleted as (delete from whylabs.profiles_overall_staging where org_id = dequeued_org_id and dataset_id = dequeued_dataset_id  returning *)
    insert into whylabs.profiles_overall_hypertable (classification_profile, regression_profile, mergeable_segment, dataset_type, dataset_timestamp, org_id, dataset_id, column_name, metric_path, d_sum, d_min, d_max, n_sum, n_min, n_max, last_upload_ts, first_upload_ts, variance, kll, frequent_items, hll, trace_id)
    with merged as (select
                        mergeable_segment,
                        dataset_type,
                        -- Note: date truncation happens in profileService
                        dataset_timestamp,
                        org_id,
                        dataset_id,
                        column_name,
                        metric_path,
                        -- Multiple traceIds could get rolled up, promote a sample of 1
                        (ARRAY_AGG(trace_id) FILTER (WHERE trace_id IS NOT NULL))[1] as trace_id,
                        -- merging the metrics here
                        sum(d_sum)                                                    as d_sum,
                        min(d_min)                                                    as d_min,
                        max(d_max)                                                    as d_max,
                        sum(n_sum)                                                    as n_sum,
                        min(n_min)                                                    as n_min,
                        max(n_max)                                                    as n_max,
                        max(last_upload_ts)                                          as last_upload_ts,
                        min(first_upload_ts)                                         as first_upload_ts,
                        whylabs.variance_tracker(variance)                            as variance,
                        kll_double_sketch_merge(kll, 1024)                            as kll,
                        classification_merge(classification_profile)                  as classification_profile,
                        regression_merge(regression_profile)                          as regression_profile,
                        frequent_strings_sketch_merge(7, case
                                                             when length(CAST(frequent_items as bytea)) > 8
                                                                 then frequent_items
                            end)                                                      as frequent_items,
                        hll_sketch_union(hll)                                         as hll
                    from deleted
                    where unmergeable_d is null and mergeable_segment != false
                    group by org_id, dataset_id, column_name, dataset_type, dataset_timestamp, metric_path, mergeable_segment)
    -- Unroll the array back into jsonb on the result
    select classification_profile, regression_profile, mergeable_segment, dataset_type, dataset_timestamp, org_id, dataset_id, column_name, metric_path, d_sum, d_min, d_max, n_sum, n_min, n_max, last_upload_ts, first_upload_ts, variance, kll, frequent_items, hll, trace_id from merged
    order by org_id desc, dataset_id desc, column_name desc, dataset_type desc, metric_path desc, dataset_timestamp desc;

    -- Promote Segmented
    with deleted as (delete from whylabs.profiles_segmented_staging where org_id = dequeued_org_id and dataset_id = dequeued_dataset_id  returning *)
    insert into whylabs.profiles_segmented_hypertable (segment_text, classification_profile, regression_profile, mergeable_segment, dataset_type, dataset_timestamp, org_id, dataset_id, column_name, metric_path, d_sum, d_min, d_max, n_sum, n_min, n_max, last_upload_ts, first_upload_ts, variance, kll, frequent_items, hll, trace_id)

-- Roll up everything we can to the hour
    with merged as (select
                        -- Can't group by jsonb so we have to turn it into an array
                        ARRAY(SELECT jsonb_array_elements_text(segment_text) as s order by 1 asc) as segment_text,
                        mergeable_segment,
                        dataset_type,
                        -- Note: date truncation happens in profileService
                        dataset_timestamp,
                        org_id,
                        dataset_id,
                        column_name,
                        metric_path,
                        -- Multiple traceIds could get rolled up, promote a sample of 1
                        (ARRAY_AGG(trace_id) FILTER (WHERE trace_id IS NOT NULL))[1] as trace_id,
                        -- merging the metrics here
                        sum(d_sum)                                                    as d_sum,
                        min(d_min)                                                    as d_min,
                        max(d_max)                                                    as d_max,
                        sum(n_sum)                                                    as n_sum,
                        min(n_min)                                                    as n_min,
                        max(n_max)                                                    as n_max,
                        max(last_upload_ts)                                          as last_upload_ts,
                        min(first_upload_ts)                                         as first_upload_ts,
                        whylabs.variance_tracker(variance)                            as variance,
                        kll_double_sketch_merge(kll, 1024)                            as kll,
                        classification_merge(classification_profile)                  as classification_profile,
                        regression_merge(regression_profile)                          as regression_profile,
                        frequent_strings_sketch_merge(7, case
                                                             when length(CAST(frequent_items as bytea)) > 8
                                                                 then frequent_items
                            end)                                                      as frequent_items,
                        hll_sketch_union(hll)                                         as hll
                    from deleted
                    where unmergeable_d is null and mergeable_segment != false
                    group by segment_text, org_id, dataset_id, column_name, dataset_type, dataset_timestamp, metric_path, mergeable_segment)
-- Unroll the array back into jsonb on the result
    select array_to_json(segment_text)::jsonb as segment_text, classification_profile, regression_profile, mergeable_segment, dataset_type, dataset_timestamp, org_id, dataset_id, column_name, metric_path, d_sum, d_min, d_max, n_sum, n_min, n_max, last_upload_ts, first_upload_ts, variance, kll, frequent_items, hll, trace_id from merged
    order by org_id desc, dataset_id desc, column_name desc, dataset_type desc, segment_text desc, metric_path desc, dataset_timestamp desc;


    return true;
END;
$$ LANGUAGE plpgsql;

-- schedule add/remove workres via globalstatusservice

-- Function to initiate the maintenance window so silver=>historical dota promotions can start rolling
CREATE OR REPLACE FUNCTION initiateSilverToHistoricalDataPromotions() RETURNS boolean AS $$
BEGIN
    if (select status from whylabs.global_system limit 1) != 'normal' THEN
        raise EXCEPTION 'Cannot initiate data promotions unless global status is in normal state';
    end if;

    -- Change global system status, older data will become un-queryable by the app because its in a data promotion state
    update whylabs.global_system set status = 'data_promotion_silver_to_historical', data_availability_cutoff = now() - INTERVAL '92 days', last_updated_timestamp = now();

    return true;
END;
$$ LANGUAGE plpgsql;

-- This gets scheduled in globalstatusservice

-- Poll for when data promotion has finished to progress the finite state machine
CREATE OR REPLACE FUNCTION pollPromotionStatus() RETURNS boolean AS $$
BEGIN
    if (select status from whylabs.global_system limit 1) != 'data_promotion_silver_to_historical' THEN
        -- Not promoting anything, skip
        return false;
    end if;

    if (select count(*) from whylabs.queue_data_promotions_silver_to_historical ) > 0 then
        -- Queue still has entries, skip
        return false;
    end if;

    -- Queue up older chunks to get re-compressed
    with older_chunks as (SELECT show_chunks('whylabs.profiles_segmented_hypertable', older_than => INTERVAL '3 months') as chunk)
    insert into whylabs.queue_timescale_compression (chunk) select chunk::text from older_chunks where older_chunks.chunk is not null and older_chunks.chunk::text <> '';

    -- Phase 2! Update global status as compressing timescale
    update whylabs.global_system set status = 'timescale_compression', last_updated_timestamp = now();

    return true;
END;
$$ LANGUAGE plpgsql;

-- This gets scheduled in globalstatusservice

-- Reaper process on data promotion incase its taking a long time
CREATE OR REPLACE FUNCTION expireSilverToHistoricalPromotionJobs() RETURNS boolean AS $$
BEGIN
    if (select status from whylabs.global_system limit 1) != 'data_promotion_silver_to_historical' THEN
        -- Not promoting anything, skip
        return false;
    end if;
    if (select count(*) from whylabs.queue_data_promotions_silver_to_historical ) = 0 then
        -- Queue's empty. All good, bail
        return false;
    end if;

    -- We started at 1am and its now 5am. Time to bail and move along to the next step so we can unleash queries
    truncate whylabs.queue_data_promotions_silver_to_historical;

    -- Phase 2! Update global status as compressing timescale
    update whylabs.global_system set status = 'timescale_compression', last_updated_timestamp = now();

    -- Queue up older chunks to get re-compressed
    with older_chunks as (SELECT show_chunks('whylabs.profiles_segmented_hypertable', older_than => INTERVAL '99 days') as chunk)
    insert into whylabs.queue_timescale_compression (chunk) select chunk::text from older_chunks where older_chunks.chunk is not null and older_chunks.chunk::text <> '';
    return true;
END;
$$ LANGUAGE plpgsql;


-- This gets scheduled in globalstatusservice


-- Phase 2 of maintenance window: Recompress already compressed timescaledb chunks. Why? When you add
-- new data to an already compressed chunk, that data isn't indexed. This results in sequential scans on
-- the uncompressed data which bogs down query performance. They need to be recompressed to make it performant
-- again. This is an active feature request (indexed uncompressed data) in timescaledb.
CREATE OR REPLACE FUNCTION compressOldChunk() RETURNS boolean AS $$
DECLARE
    dequeued_chunk text;
BEGIN
    set jit = off;
    -- Bail out if the system's not in timescale compression status
    if (select status from whylabs.global_system limit 1) != 'timescale_compression' THEN
        return false;
    end if;

    -- Dequeue a chunk to compress
    with dequeued_item as (DELETE FROM  whylabs.queue_timescale_compression  WHERE id = any (
        SELECT id FROM whylabs.queue_timescale_compression
            FOR UPDATE SKIP LOCKED

        LIMIT 1
    ) RETURNING id, chunk)
    select chunk into dequeued_chunk from dequeued_item;

    begin
        CALL recompress_chunk(dequeued_chunk);
    exception when others then
        return false;
    -- This is normal, it throws if there's no new data that needs compressing or if the chunk isn't compressed yet
    end;
    return true;

END;
$$ LANGUAGE plpgsql;

-- Workers get added/removed via globalstatusservice admin API

-- Once the compression queue is drained its time to exit the maintenance window
CREATE OR REPLACE FUNCTION pollCompressionStatus() RETURNS boolean AS $$
BEGIN
    if (select status from whylabs.global_system limit 1) != 'timescale_compression' THEN
        -- Not promoting anything, skip
        return false;
    end if;

    if (select count(*) from whylabs.queue_timescale_compression ) > 0 then
        -- Queue still has entries, skip
        return false;
    end if;

    -- Phase 3! Update global status marking everything as normal
    update whylabs.global_system set status = 'normal', last_updated_timestamp = now(), data_availability_cutoff = null;
    return true;
END;
$$ LANGUAGE plpgsql;

-- select expirePromotionJobs();
--select pollCompressionStatus();