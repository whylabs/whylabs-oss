WITH val (org_id, dataset_id, segment_text, dataset_timestamp, upload_timestamp) AS
         (VALUES (:orgId, :datasetId, :segment_text, :datasetTimestamp, :uploadTimestamp))
--          (VALUES ('org-0', 'model-0', CAST('["tag1=val1", "foo=bar"]' as jsonb), '2023-03-15T00:00:00Z'::timestamptz, now() at time zone 'utc'))

insert into whylabs.legacy_segments (org_id, dataset_id, segment_text, latest_dataset_timestamp, oldest_dataset_timestamp, latest_upload_timestamp, oldest_upload_timestamp)
select org_id,
       dataset_id,
       CAST(segment_text as jsonb),
       CAST(dataset_timestamp as timestamptz),
       CAST(dataset_timestamp as timestamptz),
       CAST(upload_timestamp as timestamptz),
       CAST(upload_timestamp as timestamptz)
from val
    ON CONFLICT (org_id, dataset_id, segment_text) DO
UPDATE set
    latest_dataset_timestamp = greatest(legacy_segments.latest_dataset_timestamp, excluded.latest_dataset_timestamp),
    oldest_dataset_timestamp = least(legacy_segments.oldest_dataset_timestamp, excluded.oldest_dataset_timestamp),
    latest_upload_timestamp = greatest(legacy_segments.latest_upload_timestamp, excluded.latest_upload_timestamp),
    oldest_upload_timestamp = least(legacy_segments.oldest_upload_timestamp, excluded.oldest_upload_timestamp)

