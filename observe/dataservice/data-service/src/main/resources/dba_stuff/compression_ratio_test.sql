


drop table drew_p_uncompressed;
drop table drew_p_compressed;

create table drew_p_uncompressed as select * from whylabs.profiles_overall_hypertable limit 50000000;
create table drew_p_compressed as select * from drew_p_uncompressed;

create table drew_p_compressed_before as select * from drew_p_uncompressed;



ALTER TABLE drew_p_compressed ALTER COLUMN org_id TYPE text;
ALTER TABLE drew_p_compressed ALTER COLUMN dataset_id TYPE text;
ALTER TABLE drew_p_compressed ALTER COLUMN column_name TYPE text;
ALTER TABLE drew_p_compressed ALTER COLUMN metric_path TYPE text;


SELECT create_hypertable('drew_p_uncompressed','dataset_timestamp', chunk_time_interval => interval '7 day', create_default_indexes => FALSE, migrate_data := true);
SELECT create_hypertable('drew_p_compressed','dataset_timestamp', chunk_time_interval => interval '7 day', create_default_indexes => FALSE, migrate_data := true);


-- Do you even need an index?
--create index drew_p_uncompressed_idx on drew_p_uncompressed (org_id, dataset_id, column_name, metric_path, dataset_timestamp);
--create index drew_p_compressed_idx on drew_p_compressed (org_id, dataset_id, column_name, metric_path, dataset_timestamp);


--timescaledb.compress_segmentby = 'org_id, dataset_id',--, column_name', 7:1 ratio
ALTER TABLE drew_p_compressed SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'org_id, dataset_id, column_name',
    timescaledb.compress_orderby = 'metric_path, dataset_timestamp desc'
    );

SELECT compress_chunk(i, if_not_compressed => true) FROM show_chunks(
                                                                 'drew_p_compressed'
                                                             ) i;

select show_chunks(
               'drew_p_compressed'
           );

select FROM chunk_compression_stats('_timescaledb_internal._hyper_354_54047_chunk');

CALL recompress_chunk('_timescaledb_internal._hyper_354_54047_chunk');

-- With column_name
-- 9186410496
-- 3025534976

select hypertable_size('drew_p_compressed');
select hypertable_size('drew_p_uncompressed');


--783777792
--5424144384
-- 7:1


    -- noinspection SqlNoDataSourceInspectionForFile

    -- drew_p_compressed 3300
    -- drew_p_uncompressed 2400
analyze drew_p_uncompressed;

SET track_io_timing = TRUE;

--UPDATE pg_attribute SET atttypid = 'text[]'::regtype, atttypmod = -1 WHERE attrelid = 'mytable'::regclass AND attname = 'mycolumn';


--   ->  WindowAgg  (cost=0.00..12.68 rows=182 width=280) (actual time=163.901..428.100 rows=38508 loops=1)
--   ->  WindowAgg  (cost=2000.87..2630.88 rows=17032 width=280) (actual time=358.794..396.764 rows=38508 loops=1)
explain(analyze, buffers) WITH
    -- IMPORTANT: merge ASAP to avoid creating large CTE in the heap
    merged_metrics as (select date_trunc('day', dataset_timestamp AT TIME ZONE 'UTC') as timestamp,
                              (select a.tag
                               from jsonb_array_elements_text(segment_text) as a(tag)
                               where a.tag like CONCAT('', '=%'))                     tag,
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
                       from drew_p_uncompressed where org_id = 'org-0'
                                                AND dataset_id = 'model-2121'
                                                and             dataset_timestamp >= CAST('2023-01-01' as TIMESTAMP)  at time zone 'UTC'
                                                AND dataset_timestamp < CAST('2024-12-12' as TIMESTAMP)  at time zone 'UTC'


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
