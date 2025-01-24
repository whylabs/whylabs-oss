CREATE TABLE IF NOT EXISTS whylabs.legacy_segments (
                                            id serial PRIMARY KEY,
                                            org_id varchar NOT NULL,
                                            dataset_id varchar NOT NULL,
                                            segment_text jsonb,
                                            latest_dataset_timestamp timestamptz,
                                            oldest_dataset_timestamp timestamptz,
                                            latest_upload_timestamp timestamptz,
                                            oldest_upload_timestamp timestamptz,
                                            UNIQUE (org_id, dataset_id, segment_text)
    );

CREATE INDEX IF NOT EXISTS tags_org_dataset_idx ON whylabs.tags(org_id, dataset_id);