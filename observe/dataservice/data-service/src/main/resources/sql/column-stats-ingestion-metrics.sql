SELECT column_name,
       least(earliest_ingest_timestamp) as earliest_ingest_timestamp,
       least(dataset_timestamp) as earliest_dataset_timestamp,
       greatest(dataset_timestamp) as greatest_dataset_timestamp,
       percentile_cont(0.50) within group (order by EXTRACT(EPOCH FROM (earliest_ingest_timestamp - dataset_timestamp)) / 60 asc ) as uploadLagP50m,
       percentile_cont(0.95) within group (order by EXTRACT(EPOCH FROM (earliest_ingest_timestamp - dataset_timestamp)) / 60 asc ) as uploadLagP95m,
       percentile_cont(0.99) within group (order by EXTRACT(EPOCH FROM (earliest_ingest_timestamp - dataset_timestamp)) / 60 asc ) as uploadLagP99m
FROM whylabs.column_stats
WHERE dataset_timestamp >= CAST(:startTS as TIMESTAMP) at time zone 'UTC'
  AND dataset_timestamp < CAST(:endTS as TIMESTAMP) at time zone 'UTC'
  AND org_id = :orgId
  AND dataset_id = :datasetId
  AND (
    (:segmentTags = CAST('{}' as text[]))
        OR
    (segment_text ?& CAST(:segmentTags as text[])))
group by column_name, earliest_ingest_timestamp, earliest_dataset_timestamp, greatest_dataset_timestamp

