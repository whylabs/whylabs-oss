-- Drop the previous unique constraint because we need to handle the edge case of 'none' tag-keys
DROP INDEX IF EXISTS resource_tags_org_id_resource_id_tag_key_key;
ALTER TABLE whylabs.resource_tags DROP CONSTRAINT IF EXISTS resource_tags_org_id_resource_id_tag_key_key;


-- Create a partial unique index for tag_keys that are NOT 'none'
CREATE UNIQUE INDEX IF NOT EXISTS resource_tags_unique_non_none_idx
    ON whylabs.resource_tags (org_id, resource_id, tag_key)
    WHERE tag_key IS DISTINCT FROM 'none';