
SELECT org_id, dataset_id, column_name, SUM(n_sum)
FROM whylabs.profiles_overall
WHERE org_id = ?
  AND (dataset_timestamp >= ?::TIMESTAMP and dataset_timestamp < ?::TIMESTAMP)
  AND metric_path = 'types/fractional'
  AND {{METRIC_QUERIES}}
GROUP BY org_id, dataset_id, column_name
ORDER BY org_id, dataset_id, column_name;