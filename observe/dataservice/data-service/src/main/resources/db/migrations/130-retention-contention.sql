-- Bumping 7->9 because I identified that the retention policy has some contention with our data promotion
select remove_retention_policy('whylabs.profiles_overall_staging');
select remove_retention_policy('whylabs.profiles_segmented_staging');

SELECT add_retention_policy('whylabs.profiles_segmented_staging', INTERVAL '9 days');
SELECT add_retention_policy('whylabs.profiles_overall_staging', INTERVAL '9 days');