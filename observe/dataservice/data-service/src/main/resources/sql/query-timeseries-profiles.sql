-- timeseries numeric query
with agg_table
         as (select time_bucket(:bucketWidth, dataset_timestamp) AS bucket,
                    PLACEHOLDER_MERGE_OPERATION                          as agg_data,
                    max(last_upload_ts)                                  as last_modified,
                    coalesce(array_agg(DISTINCT trace_id ORDER BY trace_id) FILTER (WHERE trace_id is not null), cast(array[] as text[]))   as trace_ids
             from PLACEHOLDER_TABLE
             WHERE dataset_timestamp >= CAST(:startTimestamp as TIMESTAMP) at time zone 'UTC'
               AND dataset_timestamp < CAST(:endTimestamp as TIMESTAMP) at time zone 'UTC'
               AND org_id = :orgId
               AND dataset_id = :resourceId
               AND ((:columnName is null and column_name is null) OR :columnName = column_name)
               AND metric_path = :metricPath
               AND (
                     (:segmentTags = CAST('{}' as text[]))
                     OR
                     (segment_text ?& :segmentTags)
                 )

             GROUP by bucket)
-- produce common result row format, compatible with monitor metrics
SELECT (EXTRACT(EPOCH FROM bucket) * 1000)::bigint as timestamp,
    (EXTRACT(EPOCH FROM last_modified) * 1000)::bigint as last_modified,
    PLACEHOLDER_POSTAGG_OPERATION as value,
       trace_ids[1] as trace_id
from agg_table