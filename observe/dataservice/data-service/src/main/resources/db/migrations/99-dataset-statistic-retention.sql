-- The retention policy on the underlying stat table dataset_statistics doesn't propagate to the continuous
-- aggregate. We're only trying to query if they've uploaded a bunch of profiles in the last 2 hours
SELECT add_retention_policy('whylabs.dataset_statistics_rollup', INTERVAL '2 hours', if_not_exists => TRUE);

