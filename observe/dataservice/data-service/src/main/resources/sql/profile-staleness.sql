select greatest(
    (select max(latest_upload_timestamp) as m from whylabs.tags where org_id = ? and dataset_id = ?),
    (select max(updated_timestamp) as m from whylabs.profile_deletions where org_id = ? and dataset_id = ?)
)
