CREATE EXTENSION IF NOT EXISTS btree_gin;

CREATE INDEX IF NOT EXISTS profiles_org_dataset_col_seg_idx
    ON whylabs.whylogs_profiles_v1 USING gin
        (org_id, dataset_id, column_name, dataset_timestamp, segment_text jsonb_path_ops);

CREATE INDEX IF NOT EXISTS lseg_org_dataset_seg_idx
    ON whylabs.legacy_segments USING gin (org_id, dataset_id, segment_text jsonb_path_ops);
