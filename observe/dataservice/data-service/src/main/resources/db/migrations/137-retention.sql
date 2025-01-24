-- We used to let folks upload really old data, keep tables trimmed at 5yrs

SELECT add_retention_policy('whylabs.profiles_overall_hypertable', INTERVAL '1825 days', if_not_exists => TRUE);
SELECT add_retention_policy('whylabs.profiles_segmented_hypertable', INTERVAL '1825 days', if_not_exists => TRUE);