CREATE TABLE IF NOT EXISTS whylabs.org_resource_tags (
                                                     id serial PRIMARY KEY,
                                                     org_id text NOT NULL,
                                                     tag_key text NOT NULL,
                                                     tag_values text[],
                                                     tag_color text,
                                                     tag_bgcolor text,
                                                     update_timestamp timestamptz,
                                                     UNIQUE (org_id, tag_key)
);

CREATE INDEX IF NOT EXISTS resource_tags_org_idx ON whylabs.org_resource_tags(org_id, tag_key);