-- noinspection SqlNoDataSourceInspectionForFile

WITH parameters (orgId, datasetId, columnNames, referenceId, segment_tags, traceId) as (
--     values ('org-0', 'model-2235', CAST('{image.ImagePixelWidth}' as text[]),
--             CAST('2021-09-02T00:00:00.000Z' as TIMESTAMP)  at time zone 'UTC',
--             CAST('2025-09-04T00:00:00.000Z' as TIMESTAMP)  at time zone 'UTC',
--             CAST('{}' as text[]), null)
    values (:orgId,
               --
            :datasetId,
               --
            CAST(:columnNames as text[]),
               --
            :referenceId
               --
            CAST(:tags as text[]),
            :traceId)
),
     unmerged_metrics as (select v.dataset_timestamp AT TIME ZONE 'UTC' as timestamp,
                               -- profile_id is null on all but the unmerged table so we'll typically be grouping by
                               -- an empty string (no-op). This allows us to only provide unmerged profile rollups on the
                               -- unmerged table, and not having to fork this query for the individual profiles
                               coalesce(v.profile_id, 0)                                    as profile_id,
                               segment_text,
                               v.column_name,
                               v.metric_path,
                               v.d_sum,
                               v.d_min,
                               v.d_max,
                               v.n_sum,
                               v.n_min,
                               v.n_max,
                               v.last_upload_ts,
                               v.variance,
                               v.kll,
                               v.frequent_items,
                               v.hll,
                               v.trace_id

                          from whylabs.profiles_unmerged_hypertable v
                                   INNER JOIN parameters as p
                              -- split up our OR operations in two two index-applicable operations
                                              ON dataset_timestamp >= p.startTS
                                                  AND dataset_timestamp < p.endTS
                                                  AND org_id = p.orgId
                                                  AND dataset_id = p.datasetId
                                                  -- TODO: do not allow users to query all columns here. It's a bad patten
                                                  AND (array_length(p.columnNames, 1) is NULL OR column_name = ANY (p.columnNames))
                                                  AND (p.traceId is NULL OR trace_id = p.traceId)
                                                  AND (
                                                     -- if tags are not specified, we match with all the segment entries (overall segment)
                                                         (p.segment_tags = CAST('{}' as text[]))
                                                         OR
                                                         -- exact segment matches only
                                                         (segment_text \?\?& p.segment_tags))
     ),
     n_sum_metrics as (select timestamp, column_name, segment_text, metric_path, profile_id, n_sum as longs
                       from unmerged_metrics
                       WHERE n_sum is not null),

     n_min_metrics as (select timestamp, column_name, segment_text, metric_path, profile_id, n_min as longs
                       from unmerged_metrics
                       WHERE n_min is not null),
     n_max_metrics as (select timestamp, column_name, segment_text, metric_path, profile_id, n_max as longs
                       from unmerged_metrics
                       WHERE n_max is not null),
     d_sum_metrics as (select timestamp, column_name, segment_text, metric_path, profile_id, d_sum as doubles
                       from unmerged_metrics
                       WHERE d_sum is not null),

     kll_stats as (select timestamp,
                          column_name,
                          segment_text,
                          metric_path,
                          profile_id,
                          kll_double_sketch_get_n(kll) as longs,
                          case
                              when kll_double_sketch_get_n(kll) = 0 then CAST(array [null, null] as numeric[])
                              else kll_double_sketch_get_quantiles(kll, array [0,1])
                              end                      as minmax
                   from unmerged_metrics
                   WHERE kll is not null),

     kll_n as (select timestamp,
                      column_name,
                      segment_text,
                      concat(metric_path, '/n'),
                      profile_id,
                      longs
               from kll_stats),

     -- Start doubles metrics

     kll_min as (select timestamp, column_name, segment_text, concat(metric_path, '/min'), profile_id, minmax[1] as doubles
                 from kll_stats
                 where minmax[1] is not null),

     kll_max as (select timestamp, column_name, segment_text, concat(metric_path, '/max'), profile_id, minmax[2] as doubles
                 from kll_stats
                 where minmax[2] is not null),

     stddev as (select timestamp,
                       column_name,
                       segment_text,
                       'distribution/stddev',
                       profile_id,
                       ROUND(sqrt(whylabs.variance(variance)), 4) as doubles
                from unmerged_metrics
                WHERE variance is not NULL and variance[1] > 0 AND metric_path='distribution/variance'),
     mean as (select timestamp, column_name, segment_text, 'distribution/mean', profile_id, variance[3] as doubles
              from unmerged_metrics
              WHERE variance is not NULL and variance[1] > 0 AND metric_path='distribution/variance'),

     hll_agg as (select timestamp,
                        column_name,
                        segment_text,
                        metric_path,
                        profile_id,
                        hll_sketch_get_estimate_and_bounds(hll) as hll
                 from unmerged_metrics
                 where hll is not null),

     hll_est as (select timestamp, column_name, segment_text, replace(metric_path,  'cardinality/hll', 'cardinality/est'), profile_id, hll[1] as doubles
                 from hll_agg),

     hll_upper as (select timestamp, column_name, segment_text, replace(metric_path,'cardinality/hll','cardinality/upper_1'),profile_id, hll[3] as doubles
                   from hll_agg),

     hll_lower as (select timestamp, column_name, segment_text, replace(metric_path,'cardinality/hll', 'cardinality/lower_1'), profile_id, hll[2] as doubles
                   from hll_agg),

     -- strings metrics
     kll_sketch as (select timestamp, column_name, segment_text, metric_path, profile_id, CAST(kll as text) as strings
                    from unmerged_metrics
                    WHERE kll is not null),
     frequent_strings_sketch as (select timestamp,
                                        column_name,
                                        segment_text,
                                        metric_path,
                                        profile_id,
                                        CAST(frequent_items as text) as strings
                                 from unmerged_metrics
                                 WHERE frequent_items is not null),

     unioned_results AS (
         SELECT timestamp, column_name, segment_text, metric_path, profile_id, longs, null as doubles, null as strings
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
         select timestamp,
                column_name,
                segment_text,
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
         select timestamp,
                column_name,
                segment_text,
                metric_path,
                profile_id,
                CAST(null as numeric)          as longs,
                CAST(null as double precision) as doubles,
                strings
         from (select *
               from kll_sketch
               union all
               select *
               from frequent_strings_sketch) as strings
         union all
         (select timestamp,
                 column_name,
                 segment_text,
                 'whylabs/last_upload_ts' as metric_path,
                 profile_id,
                 whylabs.first(cast(EXTRACT(EPOCH FROM last_upload_ts) * 1000 as numeric)) as longs,
                 CAST(null as double precision) as doubles,
                 null                  as strings
          from unmerged_metrics
          group by 1,2,3,5)
         union all
         (select timestamp,
                 column_name,
                 segment_text,
                 'whylabs/traceid' as metric_path,
                 profile_id,
                 CAST(null as numeric) as longs,
                 CAST(null as double precision) as doubles,
                 whylabs.first(trace_id) as strings
          from unmerged_metrics
          group by 1,2,3,5)
     )


-- return result will be deserialized into ColumnMetricEntity
select row_number() OVER () AS id,
       timestamp,
       null as reference_id,
       null as tag,
       column_name,
       metric_path,
       longs,
       doubles,
       strings,
       profile_id,
       segment_text

from unioned_results
order by segment_text, profile_id