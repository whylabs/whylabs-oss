--  return one batch per granular timestamp with gaps filled in,
--  last_modified is most recent profile upload for any batch.
--  if no profiles, set last upload to epoch origin 1970-01-01T00:00:00Z
--
WITH agg_table AS
         (
             select Time_bucket_gapfill(:bucketWidth, dataset_timestamp) as bucket,
                    (select Max(ingest_timestamp)
                     FROM  whylabs.profile_upload_audit
                     WHERE    org_id = :orgId
                       AND      dataset_id = :resourceId) as last_modified
             FROM whylabs.profile_upload_audit
             WHERE    org_id = :orgId
               AND      dataset_id = :resourceId
               AND      dataset_timestamp >= cast(:startTimestamp AS timestamp) at time zone 'UTC'
               AND      dataset_timestamp < cast(:endTimestamp AS timestamp) at time zone 'UTC'
               AND      (:metricPath IS NULL OR :metricPath IS NOT NULL )
               AND      (:segmentTags IS NULL OR :segmentTags IS NOT NULL )
               AND      (:columnName IS NULL OR :columnName IS NOT NULL )
             GROUP BY bucket)
SELECT (extract(epoch FROM bucket) * 1000)::bigint AS timestamp,
       (extract(epoch FROM last_modified) * 1000)::bigint AS last_modified,
       (COALESCE(extract(epoch FROM last_modified) * 1000, 0))::bigint AS value,
       null                                                         AS trace_id
FROM   agg_table
-- only generate secondsSinceLastUpload for timestamps after first upload
-- if there are no profiles, do not generate any missingDatapoint
where COALESCE(bucket >= (SELECT time_bucket(:bucketWidth, min(oldest_dataset_timestamp AT TIME ZONE 'UTC') )
                          FROM   whylabs.tags
                          WHERE org_id = :orgId AND dataset_id = :resourceId), false)


