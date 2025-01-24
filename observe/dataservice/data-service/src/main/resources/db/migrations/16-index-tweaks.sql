CREATE INDEX IF NOT EXISTS profile_org_dataset_column_metric_time ON whylabs.whylogs_profiles_v1(org_id, dataset_id, column_name, metric_path,dataset_timestamp);
CREATE INDEX IF NOT EXISTS analyzer_result_analyzer_time ON whylabs.whylogs_analyzer_results (org_id, dataset_id, analyzer_id, dataset_timestamp);

-- Discourage letting queries do full table scans
SET random_page_cost TO .01;

drop index if exists profiles_v1_column_name_idx;
drop index if exists profiles_v1_dataset_timestamp_idx;
drop index if exists whylogs_analyzer_results_mutable_org_idx;