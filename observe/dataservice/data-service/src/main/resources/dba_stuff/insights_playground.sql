
explain analyze WITH parameters (orgId, datasetId, columnNames, startTS, endTS, granularity, segment_tags, segment_key) as (
    values ('org-hURArx', 'model-2', CAST('{"seasonalvalue"}' as text[]),
            to_timestamp(1682395200), to_timestamp(1682568000),
            'day', CAST('{}' as text[]), null)
--     values ('org-3e8cGT', 'model-11', CAST('{}' as text[]),
--         CAST('2022-11-20T00:00:00.000Z' as TIMESTAMP)  at time zone 'UTC', CAST('2022-12-19T23:59:59.999Z' as TIMESTAMP)  at time zone 'UTC',
--         'millennium', CAST('{}' as text[]), 'age')

),
                     -- IMPORTANT: merge ASAP to avoid creating large CTE in the heap
                     merged_metrics as (select date_trunc(granularity, dataset_timestamp AT TIME ZONE 'UTC') as timestamp,
                                               (select a.tag
                                                from jsonb_array_elements_text(segment_text) as a(tag)
                                                where a.tag like CONCAT(segment_key, '=%'))                     tag,
                                               column_name,
                                               metric_path,
                                               -- merging the metrics here
                                               sum(d_sum)                                                    as d_sum,
                                               min(d_min)                                                    as d_min,
                                               max(d_max)                                                    as d_max,
                                               sum(n_sum)                                                    as n_sum,
                                               min(n_min)                                                    as n_min,
                                               max(n_max)                                                    as n_max,
                                               whylabs.variance_tracker(variance)                            as variance,
                                               kll_double_sketch_merge(kll, 1024)                                  as kll,
                                               frequent_strings_sketch_merge(7, case
                                                                                    when length(CAST(frequent_items as bytea)) > 8
                                                                                        then frequent_items
                                                   end)                                                      as frequent_items,
                                               hll_sketch_union(hll)                                         as hll

                                        from whylabs.profiles_overall_hypertable v
                                                 INNER JOIN parameters as p
                                            -- split up our OR operations in two two index-applicable operations
                                                            ON dataset_timestamp >= p.startTS
                                                                AND dataset_timestamp < p.endTS
                                                                AND org_id = p.orgId
                                                                AND dataset_id = p.datasetId
                                        group by timestamp, tag, column_name, metric_path
                     ),
                     n_sum_metrics as (select timestamp, tag, column_name, metric_path, n_sum as longs
                                       from merged_metrics
                                       WHERE n_sum is not null),

                     n_min_metrics as (select timestamp, tag, column_name, metric_path, n_min as longs
                                       from merged_metrics
                                       WHERE n_min is not null),
                     n_max_metrics as (select timestamp, tag, column_name, metric_path, n_max as longs
                                       from merged_metrics
                                       WHERE n_max is not null),
                     d_sum_metrics as (select timestamp, tag, column_name, metric_path, d_sum as doubles
                                       from merged_metrics
                                       WHERE d_sum is not null),

                     kll_stats as (select timestamp,
                                          tag,
                                          column_name,
                                          metric_path,
                                          kll_double_sketch_get_n(kll) as longs,
                                          case
                                              when kll_double_sketch_get_n(kll) = 0 then CAST(array [null, null] as numeric[])
                                              else kll_double_sketch_get_quantiles(kll, array [0,1])
                                              end                      as minmax

                                   from merged_metrics
                                   WHERE kll is not null),

                     kll_n as (select timestamp,
                                      tag,
                                      column_name,
                                      concat(metric_path, '/n'),
                                      longs
                               from kll_stats),

                     -- Start doubles metrics

                     kll_min as (select timestamp, tag, column_name, concat(metric_path, '/min'), minmax[1] as doubles
                                 from kll_stats
                                 where minmax[1] is not null),

                     kll_max as (select timestamp, tag, column_name, concat(metric_path, '/max'), minmax[2] as doubles
                                 from kll_stats
                                 where minmax[2] is not null),

                     stddev as (select timestamp,
                                       tag,
                                       column_name,
                                       'distribution/stddev',
                                       ROUND(sqrt(whylabs.variance(variance)), 4) as doubles
                                from merged_metrics
                                WHERE variance is not NULL and variance[1] > 0 AND metric_path='distribution/variance'),
                     mean as (select timestamp, tag, column_name, 'distribution/mean', variance[3] as doubles
                              from merged_metrics
                              WHERE variance is not NULL and variance[1] > 0 AND metric_path='distribution/variance'),

                     hll_agg as (select timestamp,
                                        tag,
                                        column_name,
                                        metric_path,
                                        hll_sketch_get_estimate_and_bounds(hll) as hll
                                 from merged_metrics
                                 where hll is not null),

                     hll_est as (select timestamp, tag, column_name, replace(metric_path, 'cardinality/hll', 'cardinality/est'), hll[1] as doubles
                                 from hll_agg),

                     hll_upper as (select timestamp, tag, column_name, replace(metric_path,'cardinality/hll','cardinality/upper_1'), hll[3] as doubles
                                   from hll_agg),

                     hll_lower as (select timestamp, tag, column_name, replace(metric_path,'cardinality/hll', 'cardinality/lower_1'), hll[2] as doubles
                                   from hll_agg),

                     -- strings metrics
                     kll_sketch as (select timestamp, tag, column_name, metric_path, CAST(kll as text) as strings
                                    from merged_metrics
                                    WHERE kll is not null),
                     frequent_strings_sketch as (select timestamp,
                                                        tag,
                                                        column_name,
                                                        metric_path,
                                                        frequent_items
                                                 from merged_metrics
                                                 WHERE frequent_items is not null),


                     insight1 as (select
                                      insight_list( n_sum_metrics.longs,frequent_strings_sketch_to_string(frequent_strings_sketch.frequent_items)) as insights
                                       from n_sum_metrics
                                    inner join frequent_strings_sketch on n_sum_metrics.column_name = frequent_strings_sketch.column_name
                                  where n_sum_metrics.metric_path = 'counts/n'),

                     insight2 as (select

                                      insight_list( n_sum_metrics.longs,frequent_strings_sketch_to_string(frequent_strings_sketch.frequent_items)) as insights
                                       from n_sum_metrics
                                     inner join frequent_strings_sketch on n_sum_metrics.column_name = frequent_strings_sketch.column_name
                                  where n_sum_metrics.metric_path = 'counts/max')

                select count(*) from ins.insights union select * from insight2
;



create or replace function insight_list(n_sum numeric, freq_string_summary text)
    returns jsonb
    language plpgsql
as
$$
declare
-- variable declaration
begin
    -- logic
    return '{}';
end;
$$