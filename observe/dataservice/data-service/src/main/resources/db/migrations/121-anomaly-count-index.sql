CREATE INDEX IF NOT EXISTS non_anomaly_count_idx
    ON whylabs.analysis_non_anomalies
        (org_id, dataset_id, analyzer_id, segment);-- WITH (timescaledb.transaction_per_chunk);

CREATE INDEX IF NOT EXISTS anomaly_count_idx
    ON whylabs.analysis_anomalies
        (org_id, dataset_id, analyzer_id, segment);-- WITH (timescaledb.transaction_per_chunk);

CREATE INDEX IF NOT EXISTS non_pg_anomaly_count_idx
    ON whylabs.analysis_non_anomalies_pg
        (org_id, dataset_id, analyzer_id, segment);-- WITH (timescaledb.transaction_per_chunk);

CREATE INDEX IF NOT EXISTS anomaly_pg_count_idx
    ON whylabs.analysis_anomalies_pg
        (org_id, dataset_id, analyzer_id, segment);-- WITH (timescaledb.transaction_per_chunk);

-- Note: Why are the transaction_per_chunk blocks commented out? It can't be ran within a transaction block
-- which is how liquibase operates. Workaround is running them manually in prod (already done);