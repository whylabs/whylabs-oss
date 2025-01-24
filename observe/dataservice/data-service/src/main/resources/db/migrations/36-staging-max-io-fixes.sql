drop index whylabs.max_io_staging_idx;

CREATE INDEX IF NOT EXISTS max_io_staging_idx ON whylabs.profiles_overall_staging (org_id, dataset_id, dataset_timestamp) INCLUDE (column_name, n_sum) WHERE metric_path='counts/n';
