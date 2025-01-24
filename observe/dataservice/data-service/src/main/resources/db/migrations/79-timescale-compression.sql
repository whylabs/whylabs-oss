ALTER TABLE whylabs.profiles_unmerged_hypertable SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'org_id',
    timescaledb.compress_orderby = 'dataset_id, column_name, metric_path, dataset_timestamp DESC'
    );

SELECT add_compression_policy('whylabs.profiles_unmerged_hypertable', INTERVAL '7 days', if_not_exists => true);

ALTER TABLE whylabs.profiles_segmented_hypertable SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'org_id',
    timescaledb.compress_orderby = 'dataset_id, column_name, metric_path, dataset_timestamp DESC'
    );

SELECT add_compression_policy('whylabs.profiles_segmented_hypertable', INTERVAL '7 days', if_not_exists => true);

ALTER TABLE whylabs.analysis_anomalies SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'org_id',
    timescaledb.compress_orderby = 'dataset_id, column_name, dataset_timestamp DESC'
    );

SELECT add_compression_policy('whylabs.analysis_anomalies', INTERVAL '7 days', if_not_exists => true);

ALTER TABLE whylabs.analysis_non_anomalies SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'org_id',
    timescaledb.compress_orderby = 'dataset_id, column_name, dataset_timestamp DESC'
    );

SELECT add_compression_policy('whylabs.analysis_non_anomalies', INTERVAL '7 days', if_not_exists => true);

