-- noinspection SqlNoDataSourceInspectionForFile

--  2423
--  Sort  (cost=149731.57..149731.57 rows=2 width=272) (actual time=2389.632..2406.121 rows=153984 loops=1)
--   Sort Method: external merge  Disk: 13536kB

--   Sort  (cost=149733.45..149733.53 rows=32 width=280) (actual time=3591.725..3706.903 rows=229290 loops=1)
--   Sort Method: external merge  Disk: 99848kB
-- 8850ms  3759ms
explain (analyze, format json, buffers, verbose, settings, wal) WITH
                                                                    -- IMPORTANT: merge ASAP to avoid creating large CTE in the heap
                                                                    merged_metrics as (select date_trunc('hour', dataset_timestamp AT TIME ZONE 'UTC') as timestamp,
                                                                                              (select a.tag
                                                                                               from jsonb_array_elements_text(segment_text) as a(tag)
                                                                                               where a.tag like CONCAT(null, '=%'))                     tag,
                                                                                              -- profile_id is null on all but the unmerged table so we'll typically be grouping by
                                                                                              -- an empty string (no-op). This allows us to only provide unmerged profile rollups on the
                                                                                              -- unmerged table, and not having to fork this query for the individual profiles
                                                                                              coalesce(profile_id, 0)                                    as profile_id,
                                                                                              column_name,
                                                                                              metric_path,
                                                                                              -- merging the metrics here
                                                                                              sum(d_sum)                                                    as d_sum,
                                                                                              min(d_min)                                                    as d_min,
                                                                                              max(d_max)                                                    as d_max,
                                                                                              sum(n_sum)                                                    as n_sum,
                                                                                              min(n_min)                                                    as n_min,
                                                                                              max(n_max)                                                    as n_max,
                                                                                              max(last_upload_ts)                                           as last_upload_ts,
                                                                                              whylabs.variance_tracker(variance)                            as variance,
                                                                                              kll_double_sketch_merge(kll, 4096)                                  as kll,
                                                                                              frequent_strings_sketch_merge(7, case
                                                                                                                                   when length(CAST(frequent_items as bytea)) > 8
                                                                                                                                       then frequent_items
                                                                                                  end)                                                      as frequent_items,
                                                                                              hll_sketch_union(hll)                                         as hll,
                                                                                              coalesce(array_agg(DISTINCT trace_id ORDER BY trace_id) FILTER (WHERE trace_id is not null), cast(array[] as text[]))   as trace_ids
                                                                                       from whylabs.profiles_overall where
                                                                                               dataset_timestamp >= CAST('2023-09-01' as TIMESTAMP)  at time zone 'UTC'
                                                                                                                       AND dataset_timestamp < CAST('2024-01-01' as TIMESTAMP)  at time zone 'UTC'
                                                                                                                       AND org_id = 'org-0'
                                                                                                                       AND dataset_id = 'model-0'
                                                                                                                       -- TODO: do not allow users to query all columns here. It's a bad patten
                                                                                       group by timestamp, tag, column_name, metric_path, profile_id
                                                                    ),
                                                                    n_sum_metrics as (select timestamp, tag, column_name, metric_path, profile_id, n_sum as longs
                                                                                      from merged_metrics
                                                                                      WHERE n_sum is not null),

                                                                    n_min_metrics as (select timestamp, tag, column_name, metric_path, profile_id, n_min as longs
                                                                                      from merged_metrics
                                                                                      WHERE n_min is not null),
                                                                    n_max_metrics as (select timestamp, tag, column_name, metric_path, profile_id, n_max as longs
                                                                                      from merged_metrics
                                                                                      WHERE n_max is not null),
                                                                    d_sum_metrics as (select timestamp, tag, column_name, metric_path, profile_id, d_sum as doubles
                                                                                      from merged_metrics
                                                                                      WHERE d_sum is not null),
                                                                    kll_stats as (select timestamp,
                                                                                         tag,
                                                                                         column_name,
                                                                                         metric_path,
                                                                                         profile_id,
                                                                                         kll_double_sketch_get_n(kll) as longs,
                                                                                         case
                                                                                             when kll_double_sketch_get_n(kll) = 0 then CAST(array [null, null] as numeric[])
                                                                                             else kll_double_sketch_get_quantiles(kll, array [0,1])
                                                                                             end                      as minmax
                                                                                  from merged_metrics
                                                                                  WHERE kll is not null),

                                                                    kll_n as (select
                                                                                  timestamp,
                                                                                  tag,
                                                                                  column_name,
                                                                                  concat(metric_path, '/n'),
                                                                                  profile_id,
                                                                                  longs
                                                                              from kll_stats),

                                                                    -- Start doubles metrics

                                                                    kll_min as (select timestamp, tag, column_name, concat(metric_path, '/min'), profile_id, minmax[1] as doubles
                                                                                from kll_stats
                                                                                where minmax[1] is not null),

                                                                    kll_max as (select timestamp, tag, column_name, concat(metric_path, '/max'), profile_id, minmax[2] as doubles
                                                                                from kll_stats
                                                                                where minmax[2] is not null),

                                                                    stddev as (select
                                                                                   timestamp,
                                                                                   tag,
                                                                                   column_name,
                                                                                   'distribution/stddev',
                                                                                   profile_id,
                                                                                   ROUND(sqrt(whylabs.variance(variance)), 4) as doubles
                                                                               from merged_metrics
                                                                               WHERE variance is not NULL and variance[1] > 0 AND metric_path='distribution/variance'),
                                                                    mean as (select timestamp, tag, column_name, 'distribution/mean', profile_id, variance[3] as doubles
                                                                             from merged_metrics
                                                                             WHERE variance is not NULL and variance[1] > 0 AND metric_path='distribution/variance'),

                                                                    hll_agg as (select
                                                                                    timestamp,
                                                                                    tag,
                                                                                    column_name,
                                                                                    metric_path,
                                                                                    profile_id,
                                                                                    hll_sketch_get_estimate_and_bounds(hll) as hll
                                                                                from merged_metrics
                                                                                where hll is not null),

                                                                    hll_est as (select timestamp, tag, column_name, replace(metric_path,  'cardinality/hll', 'cardinality/est'), profile_id, hll[1] as doubles
                                                                                from hll_agg),

                                                                    hll_upper as (select timestamp, tag, column_name, replace(metric_path,'cardinality/hll','cardinality/upper_1'),profile_id, hll[3] as doubles
                                                                                  from hll_agg),

                                                                    hll_lower as (select timestamp, tag, column_name, replace(metric_path,'cardinality/hll', 'cardinality/lower_1'), profile_id, hll[2] as doubles
                                                                                  from hll_agg),

                                                                    -- strings metrics
                                                                    hll_sketch as (select timestamp, tag, column_name, metric_path, profile_id, CAST(hll as text) as strings
                                                                                   from merged_metrics
                                                                                   WHERE hll is not null),
                                                                    kll_sketch as (select timestamp, tag, column_name, metric_path, profile_id, CAST(kll as text) as strings
                                                                                   from merged_metrics
                                                                                   WHERE kll is not null),
                                                                    frequent_strings_sketch as (select
                                                                                                    timestamp,
                                                                                                    tag,
                                                                                                    column_name,
                                                                                                    metric_path,
                                                                                                    profile_id,
                                                                                                    CAST(frequent_items as text) as strings
                                                                                                from merged_metrics
                                                                                                WHERE frequent_items is not null),

                                                                    unioned_results AS (
                                                                        SELECT  timestamp, tag, column_name, metric_path, profile_id, longs, null as doubles, null as strings
                                                                        FROM (
                                                                                 select *
                                                                                 from n_sum_metrics
                                                                                 UNION ALL
                                                                                 SELECT *
                                                                                 FROM n_min_metrics
                                                                                 UNION ALL
                                                                                 SELECT *
                                                                                 FROM n_max_metrics
                                                                                 UNION ALL
                                                                                 SELECT *
                                                                                 from kll_n
                                                                             ) as longs
                                                                        UNION ALL
                                                                        select
                                                                            timestamp,
                                                                            tag,
                                                                            column_name,
                                                                            metric_path,
                                                                            profile_id,
                                                                            CAST(null as numeric) as longs,
                                                                            doubles,
                                                                            null                  as strings
                                                                        from (select *
                                                                              from d_sum_metrics
                                                                              union all
                                                                              select *
                                                                              from kll_min
                                                                              union all
                                                                              select *
                                                                              from kll_max
                                                                              UNION ALL
                                                                              select *
                                                                              from stddev
                                                                              UNION ALL
                                                                              select *
                                                                              from mean
                                                                              union all
                                                                              select *
                                                                              from hll_est
                                                                              union all
                                                                              select *
                                                                              from hll_upper
                                                                              union all
                                                                              select *
                                                                              from hll_lower
                                                                             ) as doubles
                                                                        union all
                                                                        select
                                                                            timestamp,
                                                                            tag,
                                                                            column_name,
                                                                            metric_path,
                                                                            profile_id,
                                                                            CAST(null as numeric)          as longs,
                                                                            CAST(null as double precision) as doubles,
                                                                            strings
                                                                        from (select *
                                                                              from kll_sketch
                                                                              union all
                                                                              select * from hll_sketch
                                                                              union all
                                                                              select *
                                                                              from frequent_strings_sketch) as strings
                                                                        union all
                                                                        (select
                                                                             timestamp,
                                                                             tag,
                                                                             column_name,
                                                                             'whylabs/last_upload_ts' as metric_path,
                                                                             profile_id,
                                                                             cast(EXTRACT(EPOCH FROM max(last_upload_ts)) * 1000 as numeric) as longs,
                                                                             CAST(null as double precision) as doubles,
                                                                             null                  as strings
                                                                         from merged_metrics
                                                                         group by 1, 2, 3, 5)
                                                                        union all
                                                                        (select
                                                                             timestamp,
                                                                             tag,
                                                                             column_name,
                                                                             'whylabs/traceid' as metric_path,
                                                                             profile_id,
                                                                             cast(null as numeric) as longs,
                                                                             CAST(null as double precision) as doubles,
                                                                             (array_agg(DISTINCT trace_ids[1]) filter(where trace_ids <> '{}'))[1] as strings
                                                                         from merged_metrics
                                                                         group by 1, 2, 3, 5)
                                                                    )

                                                                select row_number() OVER () AS id,
                                                                       timestamp,
                                                                       tag,
                                                                       column_name,
                                                                       metric_path,
                                                                       profile_id,
                                                                       longs,
                                                                       doubles,
                                                                       strings,
                                                                       NULL as reference_id,
                                                                       NULL as segment_text
                                                                from unioned_results
                                                                order by 2, 3, 4, 5;

select sum(n_sum) as longs

from whylabs.profiles_overall where
        dataset_timestamp >= CAST('2023-09-01' as TIMESTAMP)  at time zone 'UTC'
                                AND dataset_timestamp < CAST('2024-01-01' as TIMESTAMP)  at time zone 'UTC'
                                AND org_id = 'org-0'
                                AND dataset_id = 'model-0' ;


CREATE TYPE KLL_RESULT2 AS (
                               kll_n                  bigint,
                               kll_min             numeric,
                               kll_max             numeric,
                               kll_sketch text);

create or replace function whylabs.kll_extract(kll kll_double_sketch)
    -- Values and their indexes are stored Count (1), Sum (2), Mean (3)
    -- Copied from the Java code https://github.com/whylabs/whylogs-java/blob/mainline/core/src/main/java/com/whylogs/core/statistics/datatypes/VarianceTracker.java
    returns KLL_RESULT2
as
$BODY$
DECLARE
    result KLL_RESULT2;
    minmax numeric[];
BEGIN
    if kll is null then
        return null;
    end if;

    result.kll_n =kll_double_sketch_get_n(kll);

    minmax = case
                 when kll_double_sketch_get_n(kll) = 0 then CAST(array [null, null] as numeric[])
                 else kll_double_sketch_get_quantiles(kll, array [0,1])
        end;
    result.kll_min = minmax[0];
    result.kll_max = minmax[1];
    result.kll_sketch = CAST(kll as text);
    RETURN result;
END
$BODY$
    LANGUAGE plpgsql;


drop type if exists HLL_RESULT;
CREATE TYPE HLL_RESULT AS (
                              hll_est                  numeric,
                              hll_upper             numeric,
                              hll_lower             numeric,
                              hll_sketch             text);


create or replace function whylabs.hll_extract(hll hll_sketch)
    -- Values and their indexes are stored Count (1), Sum (2), Mean (3)
    -- Copied from the Java code https://github.com/whylabs/whylogs-java/blob/mainline/core/src/main/java/com/whylogs/core/statistics/datatypes/VarianceTracker.java
    returns HLL_RESULT
as
$BODY$
DECLARE
    result HLL_RESULT;
    hll numeric[];
BEGIN
    if hll is null then
        return null;
    end if;

    hll = hll_sketch_get_estimate_and_bounds(hll);

    result.hll_est = hll[1];
    result.hll_upper = hll[3];
    result.lower = hll[2];
    result.hll_sketch = CAST(hll as text);
    RETURN result;
END
$BODY$
    LANGUAGE plpgsql;




explain (analyze, format json, buffers, verbose, settings, wal)
    -- IMPORTANT: merge ASAP to avoid creating large CTE in the heap
select row_number() OVER () AS id,
       timestamp,
       tag,
       column_name,
       metric_path,
       profile_id,
       longs,
       coalesce(doubles, (
           -- stddev   TODO: WHERE variance is not NULL and variance[1] > 0 AND metric_path='distribution/variance'
           -- TODO: metric Path distribution/stddev
           select ROUND(sqrt(whylabs.variance(variance)), 4)),
                (select variance[3] --TODO: 'distribution/mean'  WHERE variance is not NULL and variance[1] > 0 AND metric_path='distribution/variance'
                )

           ) as doubles,
       strings,
       NULL as reference_id,
       NULL as segment_text from
    (select date_trunc('hour', dataset_timestamp AT TIME ZONE 'UTC') as timestamp,
            (select a.tag
             from jsonb_array_elements_text(segment_text) as a(tag)
             where a.tag like CONCAT(null, '=%'))                     tag,
            -- profile_id is null on all but the unmerged table so we'll typically be grouping by
            -- an empty string (no-op). This allows us to only provide unmerged profile rollups on the
            -- unmerged table, and not having to fork this query for the individual profiles
            coalesce(profile_id, 0)                                    as profile_id,
            column_name,
            metric_path,
            -- merging the metrics here
            coalesce(sum(d_sum),min(d_min),max(d_max)) as doubles,
            coalesce(sum(n_sum), sum(n_sum), min(n_min), max(n_max)) as longs,
            max(last_upload_ts)                                           as last_upload_ts,
            whylabs.variance_tracker(variance)                            as variance,
            whylabs.kll_extract(kll_double_sketch_merge(kll, 4096)) as kll_extract,
            -- TODO concat(metric_path, '/min')
            whylabs.hll_extract(hll_sketch_union(hll)) as hll_extract,
            -- TODO: replace(metric_path,'cardinality/hll', 'cardinality/lower_1')
            coalesce(CAST(frequent_strings_sketch_merge(7, case
                                                               when length(CAST(frequent_items as bytea)) > 8
                                                                   then frequent_items
                end)  as text))                            as strings,

            coalesce(array_agg(DISTINCT trace_id ORDER BY trace_id) FILTER (WHERE trace_id is not null), cast(array[] as text[]))   as trace_ids
     from whylabs.profiles_overall where
             dataset_timestamp >= CAST('2023-09-01' as TIMESTAMP)  at time zone 'UTC'
                                     AND dataset_timestamp < CAST('2024-01-01' as TIMESTAMP)  at time zone 'UTC'
                                     AND org_id = 'org-0'
                                     AND dataset_id = 'model-0'
                                     -- TODO: do not allow users to query all columns here. It's a bad patten
     group by timestamp, tag, column_name, metric_path, profile_id
    ) as merged_metrics
order by 2, 3, 4, 5;
