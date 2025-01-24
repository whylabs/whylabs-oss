-- return names of features with active metrics within range
-- NOTE table name is a signal value - gets dynamically replaced at query time
SELECT DISTINCT ON (column_name) column_name
FROM bad_table_replace_me
WHERE dataset_timestamp >= CAST(:startTS as TIMESTAMP) at time zone 'UTC'
  AND dataset_timestamp < CAST(:endTS as TIMESTAMP) at time zone 'UTC'
  AND org_id = :orgId
  AND dataset_id = :datasetId
  AND (
    (:segmentTags = CAST('{}' as text[]))
        OR
    (segment_text ?& CAST(:segmentTags as text[])))
  AND metric_path = 'counts/n';
