with agg_table
         as (select time_bucket(:bucketWidth, dataset_timestamp) AS bucket,
                    PLACEHOLDER_MERGE_OPERATION                          as agg_data
             from whylabs.analysis
             WHERE dataset_timestamp >= CAST(:startTS as TIMESTAMP) at time zone 'UTC'
               AND dataset_timestamp < CAST(:endTs as TIMESTAMP) at time zone 'UTC'
               AND org_id = :orgId
               AND dataset_id = :resourceId
               AND column_name = :columnName
               AND segment = :segment
               AND (:monitorId is null or monitor_ids @> ARRAY[:monitorId] )
               AND (:analyzerId is null or analyzer_id = :analyzerId)
             GROUP by bucket)

-- produce common result row format, compatible with profile metrics
SELECT (EXTRACT(EPOCH FROM bucket) * 1000)::::bigint as timestamp,
        null as last_modified,
        PLACEHOLDER_POSTAGG_OPERATION as value,
       null as trace_id
from agg_table