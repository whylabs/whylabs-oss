SELECT EXTRACT(EPOCH FROM DATE_TRUNC('hour', min_start_timestamp))::float * 1000 as dateTime,
       SUM(duration)::integer AS totalLatencyMillis,
       SUM(total_tokens)::integer AS totalTokens,
       COUNT(trace_id) AS total,
       COUNT(trace_id) FILTER (WHERE CARDINALITY(unique_tags) > 0) AS totalWithPolicyIssues,
       COUNT(trace_id) FILTER (WHERE ARRAY_TO_STRING(unique_actions, ',') LIKE '%block%') AS totalBlocked
FROM (SELECT trace_id,
             MIN(start_timestamp) AS min_start_timestamp,
             SUM(CASE WHEN parent_id IS NULL THEN EXTRACT(epoch FROM end_timestamp - start_timestamp)::double precision * 1000 ELSE 0 END) AS duration,
             SUM((attributes ->> 'llm.usage.total_tokens')::integer) AS total_tokens,
             (SELECT ARRAY_AGG(DISTINCT tag)
              FROM (SELECT UNNEST(tags) AS tag
                    FROM span_entries se2
                    WHERE se2.trace_id = se.trace_id) AS subquery) AS unique_tags,
             (SELECT ARRAY_AGG(DISTINCT action)
              FROM (SELECT ((attributes ->> 'whylabs.secure.action')::json->'type')::text AS action
                    FROM span_entries se2
                    WHERE  se2.trace_id = se.trace_id) AS subquery) AS unique_actions
      FROM span_entries se
      WHERE resource_id = $1
        AND start_timestamp >= $2
        AND start_timestamp < $3
      GROUP BY trace_id) trace_summary
WHERE min_start_timestamp >= $4
AND min_start_timestamp < $5
GROUP BY DATE_TRUNC('hour', min_start_timestamp)