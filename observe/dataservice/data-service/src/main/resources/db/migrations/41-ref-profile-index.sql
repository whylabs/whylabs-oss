CREATE INDEX IF NOT EXISTS ref_profile_segment_aggregate_idx
    ON whylabs.reference_profiles
        (org_id, dataset_id, segment_text, reference_profile_id) ;