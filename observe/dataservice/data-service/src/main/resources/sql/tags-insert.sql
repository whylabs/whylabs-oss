insert into whylabs.tags_staging (org_id, dataset_id, tag_key, tag_value, latest_dataset_timestamp, oldest_dataset_timestamp, latest_upload_timestamp, oldest_upload_timestamp)
values (:orgId, :datasetId, :tag_key, :tag_value, CAST(:datasetTimestamp as timestamptz), CAST(:datasetTimestamp as timestamptz), CAST(:uploadTimestamp as timestamptz), CAST(:uploadTimestamp as timestamptz));




