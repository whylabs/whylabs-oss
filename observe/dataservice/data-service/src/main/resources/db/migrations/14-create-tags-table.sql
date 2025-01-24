CREATE TABLE IF NOT EXISTS whylabs.tags (
                                                           id serial PRIMARY KEY,
                                                           org_id varchar NOT NULL,
                                                           dataset_id varchar NOT NULL,
                                                           tag_key varchar,
                                                           tag_value varchar,
                                                           latest_dataset_timestamp timestamptz,
                                                           oldest_dataset_timestamp timestamptz,
                                                           latest_upload_timestamp timestamptz,
                                                           oldest_upload_timestamp timestamptz,
                                                           UNIQUE (org_id, dataset_id, tag_key, tag_value)
);

CREATE INDEX IF NOT EXISTS tags_org_dataset_idx ON whylabs.tags(org_id, dataset_id);