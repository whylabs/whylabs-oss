-- extract missingDatapoint metrics - just the buckets for which we have no metrics.
-- Designed to play well with timeseries metrics, but sufficiently specialized that it get its own SQL query.

WITH agg_table
         AS (SELECT Time_bucket_gapfill(:bucketWidth, dataset_timestamp) AS bucket,
                    whylabs.First(dataset_timestamp)                     AS agg_data
             FROM   PLACEHOLDER_TABLE
             WHERE dataset_timestamp >= Cast(:startTimestamp AS TIMESTAMP) AT TIME zone 'UTC'
               AND dataset_timestamp < Cast(:endTimestamp AS TIMESTAMP) AT TIME zone 'UTC'
               AND org_id = :orgId
               AND dataset_id = :resourceId
               -- if :columnName is null, ignore it, match all columns.
               -- otherwise match only the column explicitly called for.
               AND ( :columnName IS NULL
                 OR ( :columnName IS NOT NULL
                     AND :columnName = column_name ) )
               -- ignore :metricPath entirely, it is not used
               AND ( :metricPath IS NULL OR :metricPath IS NOT NULL )
               AND ( ( :segmentTags = Cast('{}' AS TEXT[]) )
                 OR ( segment_text ?& :segmentTags ) )
             GROUP  BY bucket)
-- produce common result row format, compatible with numeric metrics
SELECT ( Extract(epoch FROM bucket) * 1000 ) :: bigint AS timestamp,
       NULL                                            AS last_modified,
       -- return 1 if missing, 0 otherwise
       1                                               AS value,
       NULL                                            AS trace_id
FROM   agg_table
WHERE  agg_data IS NULL
  -- only generate missingDatapoint for timestamps after first upload
  -- if there are no profiles, do not generate any missingDatapoint
  AND COALESCE(bucket >= (SELECT Min(oldest_dataset_timestamp) AT TIME zone 'UTC'
                         FROM   whylabs.tags
                         WHERE org_id = :orgId
                         AND dataset_id = :resourceId
              ), false)
ORDER  BY timestamp ASC

