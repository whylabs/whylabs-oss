CREATE TABLE IF NOT EXISTS whylabs.resource_tags (
                                            id serial PRIMARY KEY,
                                            org_id text NOT NULL,
                                            resource_id text NOT NULL,
                                            tag_key text,
                                            tag_value text,
                                            update_timestamp timestamptz,
                                            UNIQUE (org_id, resource_id, tag_key)
);
-- Only one value per tag key

CREATE INDEX IF NOT EXISTS resource_tags_org_resource_idx ON whylabs.resource_tags(org_id, resource_id);