ALTER TABLE whylabs.analysis_anomalies  SET (timescaledb.compress = false);
ALTER TABLE whylabs.analysis_non_anomalies  SET (timescaledb.compress = false);

-- Keep tables packed in order to improve adhoc backfill upsert performance
SELECT add_reorder_policy('whylabs.analysis_anomalies', 'anomaly_general2_idx', if_not_exists=>true, initial_start=>'2019-01-01');
SELECT add_reorder_policy('whylabs.analysis_non_anomalies', 'non_anomaly_general2_idx', if_not_exists=>true, initial_start=>'2019-01-01');