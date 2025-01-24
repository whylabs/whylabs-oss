-- I actually wanna drop this view entirely, but that's a 2 code deploy op. Dropping the aggressive retention period
-- for now cause its causing issues.


SELECT remove_retention_policy('whylabs.dataset_statistics_rollup');
SELECT add_retention_policy('whylabs.dataset_statistics_rollup', INTERVAL '2 days', if_not_exists => TRUE);