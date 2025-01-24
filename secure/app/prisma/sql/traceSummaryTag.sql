SELECT
    EXTRACT(EPOCH FROM DATE_TRUNC('hour', start_timestamp))::float * 1000 AS dateTime,
    tag,
    COUNT(*) AS occurrence_count
FROM
    span_entries,
    UNNEST(tags) AS tag
WHERE resource_id = $1
  AND start_timestamp >= $2
  AND start_timestamp < $3
GROUP BY dateTime, tag
ORDER BY occurrence_count DESC;