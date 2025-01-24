SELECT set_chunk_time_interval('whylabs.dataset_statistics', INTERVAL '24 hours');
SELECT remove_retention_policy('whylabs.dataset_statistics');
SELECT add_retention_policy('whylabs.dataset_statistics', INTERVAL '48 hours');