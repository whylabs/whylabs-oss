CREATE INDEX IF NOT EXISTS ref_profile_index
    ON whylabs.reference_profiles USING gin
        (org_id, dataset_id, reference_profile_id, metric_path, segment_text jsonb_path_ops);