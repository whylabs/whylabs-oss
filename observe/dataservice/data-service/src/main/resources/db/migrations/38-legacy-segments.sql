CREATE INDEX IF NOT EXISTS legacy_segment_visible_idx
    ON whylabs.legacy_segments  (org_id, dataset_id) INCLUDE (hidden, segment_text);
