WITH parameters (orgId, datasetId, reference_id, columnNames, segment_tags) as (
--     concrete values
--     values ('org-3e8cGT', 'model-10', 'ref-gUZOGdkM99L36Cmi', CAST('{}' as text[]), CAST('{}' as text[]))

    values (:orgId, :datasetId, :referenceId, CAST(:columnNames as text[]), CAST(:segment_tags as text[]))
),
     ref_profile as (select reference_profile_id as reference_id,
                            org_id,
                            dataset_id,
                            column_name,
                            metric_path,
                            last_upload_ts,
                            n_sum,
                            n_min,
                            n_max,
                            d_sum,
                            kll,
                            hll,
                            variance,
                            frequent_items
                     from whylabs.reference_profiles CROSS JOIN parameters
                     where ( array_length(columnNames, 1) is NULL OR column_name=ANY(columnNames) )
                       AND org_id = orgId
                       AND dataset_id = datasetId
                       AND (
                     -- if tags are not specified, we match with all the segment entries (overall segment)
                         (segment_tags = CAST('{}' as text[]))
                        OR
                     -- if tags are specified, we match with a segment. This is legacy logic atm
                     -- https://stackoverflow.com/questions/66600968/usage-of-in-native-sql-query-on-jsonb
                     -- The backslashes escape hibernate parameter detection, and the two question-marks are the JDBC escape.
                         (segment_text \?\?& segment_tags))
                       AND reference_profile_id = reference_id),

     --  results from the next three selects go into the "longs" results column
     n_sum_metrics as (
         select column_name, metric_path, reference_id, sum(n_sum) as longs
         from ref_profile
         where n_sum is not null
         group by column_name, metric_path, reference_id),

     n_min_metrics as (select column_name, metric_path, reference_id, min(n_min) as longs
                       from ref_profile
                       where n_min is not null
                       group by column_name, metric_path, reference_id),

     n_max_metrics as (select column_name, metric_path, reference_id, max(n_max) as longs
                       from ref_profile
                       where n_max is not null
                       group by column_name, metric_path, reference_id),

     --  results from the next selects go into the "doubles" results column
     d_sum_metrics as (select column_name, metric_path, reference_id, sum(d_sum) as doubles
                       from ref_profile
                       where d_sum is not null
                       group by dataset_id, column_name, metric_path, reference_id),


     kll as (select column_name, metric_path, reference_id, kll_double_sketch_merge(kll, 1024) as kll
             from ref_profile
             where kll is not null
             group by column_name, metric_path, reference_id),

     kll_n as (select column_name, concat(metric_path,'/n'), reference_id,
                      kll_double_sketch_get_n(kll) as longs
               from kll),

     kll_minmax as (select column_name, metric_path, reference_id,
                           case
                               when kll_double_sketch_get_n(kll) = 0 then CAST(array[null, null] as numeric[])
                               else kll_double_sketch_get_quantiles(kll, array[0,1])
                               end as minmax
                    from kll),

     kll_min as (select column_name, concat(metric_path, '/min'), reference_id, minmax[1] as doubles
                 from kll_minmax
                 where minmax[1] is not null),

     kll_max as (select column_name, concat(metric_path, '/max'), reference_id, minmax[2] as doubles
                 from kll_minmax
                 where minmax[2] is not null),

     --  return the entire kll sketch for derivation of summary histogram
     kll_sketch as (select column_name, metric_path, reference_id, CAST(kll as text) as strings
                    from kll),

     --  produce "{ "stddev" : 28.88194360957494,  "mean" : 49.95  }"
     variance_agg as (select column_name, metric_path, reference_id, whylabs.variance_tracker(variance) as v
                      from ref_profile
                      where variance is not null
                        and variance[1] > 0 AND metric_path='distribution/variance'
                      group by column_name, metric_path, reference_id),

     stddev as (select column_name, 'distribution/stddev', reference_id, sqrt(whylabs.variance(v)) as doubles
                from variance_agg),

     mean as (select column_name, 'distribution/mean', reference_id, v[3] as doubles
              from variance_agg),

     frequent_strings as (select column_name, metric_path, reference_id,
                                 -- Avoid merging empty frequent_items sketches
                                 -- empty sketches have encoded length <= 8 bytes
                                 case
                                    when length(CAST(frequent_items as bytea)) > 8 then frequent_items
                                    else null
                                 end as frequent_items
                                 from ref_profile
                                 where frequent_items is not null
                                 ),

     -- Merge frequent_items sketch
     -- `7` is a magic number to match the aggregation size in druid.
     frequent_strings_sketch as (select column_name,metric_path,reference_id,CAST(frequent_strings_sketch_merge(7, frequent_items) as text) as strings
                               from frequent_strings
                               group by column_name, metric_path, reference_id),

     hll_agg as (select column_name, metric_path, reference_id, hll_sketch_get_estimate_and_bounds(hll_sketch_union(hll)) as hll
                 from ref_profile
                 where hll is not null
                 group by column_name, metric_path, reference_id),

     hll_est as (select column_name, replace(metric_path, 'cardinality/hll', 'cardinality/est'), reference_id, hll[1] as doubles
                 from hll_agg),

     hll_upper as (select column_name, replace(metric_path,'cardinality/hll','cardinality/upper_1'), reference_id, hll[3] as doubles
                   from hll_agg),

     hll_lower as (select column_name, replace(metric_path,'cardinality/hll', 'cardinality/lower_1'), reference_id, hll[2] as doubles
                   from hll_agg),

     --  results are placed into one of 5 columns distinguished by type.
     --     longs, doubles, strings
     --
     --  before we can union the sub-selects, we must rationalize the various result types.


     unioned_results as (
         --  integer results
         select column_name, metric_path, reference_id, longs, null as doubles, null as strings
         from (
                  select * from n_sum_metrics
                  union all select * from n_min_metrics
                  union all select * from n_max_metrics
                  union all select * from kll_n) as longs

              --  doubles results
         union all select column_name, metric_path, reference_id, CAST(null as numeric) as longs, doubles, null as strings
         from (
                  select * from d_sum_metrics
                  union all select * from kll_min
                  union all select * from kll_max
                  union all select * from stddev
                  union all select * from mean
                  union all select * from hll_est
                  union all select * from hll_upper
                  union all select * from hll_lower
              )  as doubles

              --  string results
         union all select column_name,metric_path,reference_id,CAST(null as numeric) as longs,CAST(null as double precision) as doubles,strings
         from (select * from kll_sketch
               union all select * from frequent_strings_sketch
              ) as strings
     )

select
    row_number() OVER () AS id,
    reference_id,
    null as tag,
    column_name,
    metric_path,
    NULL as profile_id,
    longs,
    doubles,
    strings,
    NULL as timestamp,
    NULL as segment_text

from unioned_results order by 2, 3, 4;
