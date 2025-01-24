-- noinspection SqlNoDataSourceInspectionForFile
with    OVERALL AS (SELECT analyzer_id,
                        (unnest(monitor_ids)) as monitor_id,
                        anomaly_count
                 from whylabs.analysis
                                     where org_id = :orgId
                                         AND dataset_id = :datasetId
                                         AND dataset_timestamp >= CAST(:startTS as TIMESTAMP) at time zone 'UTC'
                                         AND dataset_timestamp < CAST(:endTS as TIMESTAMP) at time zone 'UTC'
                                         AND (target_level = :targetLevel)
                                         AND (:targetColumn is NULL or column_name = :targetColumn)
                                         AND (:targetMetric is NULL or metric = :targetMetric)
                                         and (monitor_ids is not null)
                                         AND (:targetSegmentTags is NULL
                                             OR COALESCE(tags, CAST('[]' as jsonb)) = CAST(array_to_json(CAST(:targetSegmentTags as text[])) as jsonb)
                                            )),
     RESULT AS (SELECT monitor_id,
                       sum(anomaly_count) as anomalies_count,
                       count(*)           as total_count
                FROM OVERALL
                GROUP BY monitor_id)
SELECT monitor_id, anomalies_count, total_count
FROM RESULT
ORDER BY anomalies_count DESC, monitor_id
LIMIT :limit OFFSET :offset
