
-- POC, what if you made the table less vertical putting all col metrics into arrays on a single row?

drop table if exists whylabs.profiles_less_vertical_experiment;

-- Create table
create table whylabs.profiles_less_vertical_experiment
(
    id                     bigint default nextval('whylabs.profiles_segmented_staging_id_seq'::regclass) not null,
    org_id                 varchar                                                                       not null,
    dataset_id             varchar                                                                       not null,
    column_name            varchar,
    metric_path            varchar[] ,
    segment_text           jsonb,
    dataset_tags           jsonb,
    dataset_timestamp      timestamp with time zone                                                      not null,
    -- Store variance differently b/c you can't array_agg arrays
    variance_count               numeric[],
    variance_sum               numeric[] ,
    variance_mean               numeric[] ,
    d_sum                  numeric[] ,
    d_min                  numeric[] ,
    d_max                  numeric[] ,
    unmergeable_d          numeric[] ,
    n_sum                  bigint[] ,
    n_min                  bigint[] ,
    n_max                  bigint[] ,
    dataset_type           dataset_type_enum                                                             not null,
    mergeable_segment      boolean                                                                       not null,
    kll                    kll_double_sketch[] ,
    hll                    hll_sketch[] ,
    frequent_items         frequent_strings_sketch[] ,
    classification_profile bytea[] ,
    regression_profile     bytea[] ,
    last_upload_ts         timestamp with time zone[],
    first_upload_ts        timestamp with time zone[],
    trace_id               text,
    profile_id             numeric
);

SELECT create_hypertable('whylabs.profiles_less_vertical_experiment','dataset_timestamp', chunk_time_interval => interval '7 day', create_default_indexes => FALSE);

-- Populate Table
truncate whylabs.profiles_less_vertical_experiment;
insert into whylabs.profiles_less_vertical_experiment (org_id, dataset_id, column_name, dataset_timestamp, dataset_type, mergeable_segment, metric_path, hll, kll, variance_count, variance_sum, variance_mean, d_sum, d_min, d_max, unmergeable_d, n_sum, n_min, n_max, frequent_items, classification_profile, regression_profile, last_upload_ts, first_upload_ts)
select  org_id, dataset_id, column_name, dataset_timestamp, dataset_type, mergeable_segment, array_agg(metric_path),   array_agg(hll),
        array_agg(kll),
        -- Store variance differently b/c you can't array_agg arrays
        array_agg(variance[1]),
        array_agg(variance[2]),
        array_agg(variance[3]),
        array_agg(d_sum)  ,
        array_agg(d_min) , array_agg(d_max) , array_agg(unmergeable_d) , array_agg(n_sum)  , array_agg(n_min) , array_agg(n_max) ,
        array_agg(frequent_items) , array_agg(classification_profile) , array_agg(regression_profile), array_agg(last_upload_ts)
        ,array_agg(first_upload_ts)
from whylabs.profiles_overall_hypertable group by dataset_timestamp, column_name, trace_id, profile_id, org_id, dataset_id, dataset_type, mergeable_segment;

create index profiles_less_vertical_experiment_idx1
    on whylabs.profiles_less_vertical_experiment (org_id, dataset_id, column_name, dataset_timestamp);

-- Custom type defines the structure of the UDF output (looks like old table)
CREATE TYPE PROFILE_RECORD_POC2 AS (    org_id                 varchar,
                                        dataset_id             varchar,
                                        column_name            varchar,
                                        metric_path            varchar,
                                        segment_text           jsonb,
                                        dataset_tags           jsonb,
                                        dataset_timestamp      timestamp with time zone,
                                        variance               numeric[],
                                        d_sum                  numeric,
                                        d_min                  numeric,
                                        d_max                  numeric,
                                        unmergeable_d          numeric,
                                        n_sum                  bigint,
                                        n_min                  bigint,
                                        n_max                  bigint,
                                        dataset_type           dataset_type_enum,
                                        mergeable_segment      boolean,
                                        kll                    kll_double_sketch,
                                        hll                    hll_sketch,
                                        frequent_items         frequent_strings_sketch,
                                        classification_profile bytea,
                                        regression_profile     bytea,
                                        last_upload_ts         timestamp with time zone,
                                        first_upload_ts        timestamp with time zone,
                                        trace_id               text,
                                        profile_id             numeric);

-- UDF to unnest the records to look like the old table (1row/metric)
CREATE OR REPLACE FUNCTION explode_profile_record_poc(
    org_id varchar,
    dataset_id varchar,
    column_name varchar,
    metric_path varchar[],
    segment_text jsonb,
    dataset_tags jsonb,
    dataset_timestamp timestamp with time zone,
    variance_count numeric[],
    variance_sum numeric[],
    variance_mean numeric[],
    d_sum numeric[],
    d_min numeric[],
    d_max numeric[],
    unmergeable_d numeric[],
    n_sum bigint[],
    n_min bigint[],
    n_max bigint[],
    dataset_type dataset_type_enum,
    mergeable_segment boolean,
    kll kll_double_sketch[],
    hll hll_sketch[],
    frequent_items frequent_strings_sketch[],
    classification_profile bytea[],
    regression_profile bytea[],
    last_upload_ts timestamp with time zone[],
    first_upload_ts timestamp with time zone[],
    trace_id text,
    profile_id numeric)
    RETURNS PROFILE_RECORD_POC2[] as
$$
DECLARE
    records PROFILE_RECORD_POC2[];
BEGIN
    FOR i IN 1..array_length(metric_path, 1)
        LOOP
            records[i] =
                    ROW (org_id, dataset_id, column_name, metric_path[i], segment_text, dataset_tags, dataset_timestamp, ARRAY [variance_count[i], variance_sum[i], variance_mean[i]], d_sum[i], d_min[i], d_max[i], unmergeable_d[i], n_sum[i], n_min[i], n_max[i], dataset_type, mergeable_segment, kll[i], hll[i], frequent_items[i], classification_profile[i],
                        regression_profile[i], last_upload_ts[i], first_upload_ts[i], trace_id, profile_id);
        END LOOP;

    RETURN records;
END;
$$ LANGUAGE plpgsql;


-- How to grab a single metric
explain analyze
WITH exploded as (select (
                             unnest(
                                     explode_profile_record_poc(
                                             org_id, dataset_id, column_name, metric_path,
                                             segment_text, dataset_tags, dataset_timestamp,
                                             variance_count, variance_sum, variance_mean,
                                             d_sum, d_min, d_max, unmergeable_d,
                                             n_sum, n_min, n_max, dataset_type,
                                             mergeable_segment, kll, hll, frequent_items,
                                             classification_profile, regression_profile,
                                             last_upload_ts, first_upload_ts,
                                             trace_id, profile_id
                                         )
                                 )
                             ).*
                  from whylabs.profiles_less_vertical_experiment
                  where org_id = 'org-0'
                    and dataset_id = 'model-2120'
                    and dataset_timestamp > '2023-01-01'
                    and dataset_timestamp < '2023-06-01')
select *
from exploded
where metric_path = 'distribution/variance'
limit 100;

-- Benchmark

-- Old table for comparison
explain analyze select hll_sketch_get_estimate(hll_sketch_union(hll)) from whylabs.profiles_overall_hypertable where org_id = 'org-0' and dataset_id = 'model-2120' and dataset_timestamp > '2023-01-01' and dataset_timestamp < '2023-06-01';
-- 900ms uncached, 90ms cached

-- New table
explain analyze WITH
                    exploded as (select unnest(hll) as hll from whylabs.profiles_less_vertical_experiment where org_id = 'org-0' and dataset_id = 'model-2120' and dataset_timestamp > '2023-01-01'  and dataset_timestamp < '2023-06-01')
                select hll_sketch_get_estimate(hll_sketch_union(hll)) from exploded where hll is not null;
-- 77ms uncached

-- compare table sizes
SELECT * FROM hypertable_detailed_size('whylabs.profiles_overall_hypertable') ORDER BY node_name;
SELECT * FROM hypertable_detailed_size('whylabs.profiles_less_vertical_experiment') ORDER BY node_name;

explain analyze WITH
                    exploded as (select (unnest(explode_profile_record_poc(org_id, dataset_id, column_name, metric_path, segment_text, dataset_tags, dataset_timestamp, variance_count, variance_sum, variance_mean, d_sum, d_min, d_max, unmergeable_d, n_sum, n_min, n_max, dataset_type, mergeable_segment, kll, hll, frequent_items, classification_profile,
                                                                          regression_profile, last_upload_ts, first_upload_ts, trace_id, profile_id))).*  from whylabs.profiles_less_vertical_experiment where org_id = 'org-0' and dataset_id = 'model-2120' and dataset_timestamp > '2023-06-01'
                  and dataset_timestamp < '2023-12-01') select * from exploded where metric_path = 'distribution/variance' limit 100;


explain analyze WITH
                    -- IMPORTANT: merge ASAP to avoid creating large CTE in the heap
                    exploded as (select unnest(hll) as hll from whylabs.profiles_less_vertical_experiment where org_id = 'org-0' and dataset_id = 'model-2120' and dataset_timestamp > '2023-01-01'  and dataset_timestamp < '2023-06-01')
                select hll_sketch_get_estimate(hll_sketch_union(hll)) from exploded where hll is not null;

select * from whylabs.profiles_less_vertical_experiment limit 10;