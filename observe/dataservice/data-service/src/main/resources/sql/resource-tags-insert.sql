insert into whylabs.resource_tags (org_id, resource_id, tag_key, tag_value, update_timestamp)
values (:orgId, :resourceId, :tagKey, :tagValue, CAST(:updateTimestamp as timestamptz));