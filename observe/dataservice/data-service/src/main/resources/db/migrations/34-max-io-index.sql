-- This index exists purely for the maxio query, so if we change that endpoint considerably then we'll wanna
-- re-evaluate this index since its so narrow in scope.

CREATE INDEX IF NOT EXISTS max_io_idx ON whylabs.profiles_overall_hypertable (org_id, dataset_id, dataset_timestamp) INCLUDE (column_name, n_sum) WHERE metric_path='counts/n';
CREATE INDEX IF NOT EXISTS max_io_staging_idx ON whylabs.profiles_segmented_hypertable (org_id, dataset_id, dataset_timestamp) INCLUDE (column_name, n_sum) WHERE metric_path='counts/n';

-- Note GIN indexes don't support INCLUDE operator so we can't use json_ops. Need to evaluate whether an index like this
-- outperforms heap hits on more selective index scans from the current index. A/B test might look something like this:
--CREATE INDEX IF NOT EXISTS max_io_segmented_idx
--    ON whylabs.profiles_segmented_staging
--        (org_id, dataset_id, dataset_timestamp)  INCLUDE (column_name, n_sum, segment_text)  WHERE metric_path='counts/n';
--CREATE INDEX IF NOT EXISTS max_io_segmented_staging_idx
--    ON whylabs.profiles_segmented_staging
--        (org_id, dataset_id, dataset_timestamp)  INCLUDE (column_name, n_sum, segment_text)  WHERE metric_path='counts/n';

-- Note these indexes needs a vacuumed table to work effectively
--vacuum analyze whylabs.profiles_overall_hypertable;
--vacuum analyze whylabs.profiles_segmented_hypertable;