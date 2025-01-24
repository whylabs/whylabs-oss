drop index whylabs.promotion_adhoc_index;

-- Improve the selectivity of the index scan for faster data promotion
CREATE INDEX if not exists  promotion_adhoc_index2 ON whylabs.analysis_adhoc (run_id, column_name, anomaly_count, dataset_timestamp);