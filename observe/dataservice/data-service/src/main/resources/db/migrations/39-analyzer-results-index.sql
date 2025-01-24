CREATE INDEX IF NOT EXISTS anomaly_general_idx
    ON whylabs.analysis_anomalies
        (org_id, dataset_id, dataset_timestamp, segment, column_name)  INCLUDE (analyzer_type, metric, analysis_id, run_id, monitor_ids, failure_type, anomaly_count);

CREATE INDEX IF NOT EXISTS non_anomaly_general_idx
    ON whylabs.analysis_non_anomalies
        (org_id, dataset_id, dataset_timestamp, segment, column_name)  INCLUDE (analyzer_type, metric, analysis_id, run_id, monitor_ids, failure_type, anomaly_count);
