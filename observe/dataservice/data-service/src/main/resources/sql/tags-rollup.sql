with deleted as (delete from whylabs.tags_staging returning *)

insert into whylabs.tags (org_id, dataset_id, tag_key, tag_value, latest_dataset_timestamp, oldest_dataset_timestamp, latest_upload_timestamp, oldest_upload_timestamp)
select org_id,
       dataset_id,
       tag_key,
       tag_value,
       max(CAST(latest_dataset_timestamp as timestamptz)),
       min(CAST(oldest_dataset_timestamp as timestamptz)),
       max(CAST(latest_upload_timestamp as timestamptz)),
       min(CAST(oldest_upload_timestamp as timestamptz))
from deleted
group by org_id, dataset_id, tag_key, tag_value
ON CONFLICT (org_id, dataset_id, tag_key, tag_value) DO
    UPDATE set
               latest_dataset_timestamp = greatest(tags.latest_dataset_timestamp, excluded.latest_dataset_timestamp),
               oldest_dataset_timestamp = least(tags.oldest_dataset_timestamp, excluded.oldest_dataset_timestamp),
               latest_upload_timestamp = greatest(tags.latest_upload_timestamp, excluded.latest_upload_timestamp),
               oldest_upload_timestamp = least(tags.oldest_upload_timestamp, excluded.oldest_upload_timestamp);
