-- Segmented maxio queries are really slow without an index. Note GIN indexes don't support INCLUDE clause
CREATE INDEX IF NOT EXISTS max_io_segmented_staging_idx
    ON whylabs.profiles_segmented_staging
        (org_id, dataset_id, dataset_timestamp)  INCLUDE (column_name, n_sum, segment_text)  WHERE metric_path='counts/n';
CREATE INDEX IF NOT EXISTS max_io_segmented_idx
    ON whylabs.profiles_segmented_hypertable
        (org_id, dataset_id, dataset_timestamp)  INCLUDE (column_name, n_sum, segment_text)  WHERE metric_path='counts/n';
