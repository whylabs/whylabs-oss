insert into whylabs.org_resource_tags(org_id, tag_key, tag_values, tag_color, tag_bgcolor, update_timestamp)
values (?, ?, ?::text[], ?, ?, now())
ON CONFLICT (org_id, tag_key) DO UPDATE set
    tag_values = coalesce(excluded.tag_values, org_resource_tags.tag_values),
    tag_color = coalesce(excluded.tag_color, org_resource_tags.tag_color),
    tag_bgcolor = coalesce(excluded.tag_bgcolor, org_resource_tags.tag_bgcolor),
    update_timestamp = now()
;