SELECT COUNT(trace_id) as total_traces
FROM (SELECT trace_id
      FROM span_entries se
      WHERE resource_id = $1
        AND start_timestamp >= $2
        AND start_timestamp < $3
        AND ($4 = '' OR trace_id LIKE '%' || $4 || '%')
      GROUP BY trace_id
      HAVING ($5 = -1 OR COALESCE(CARDINALITY(ARRAY_AGG(se.tags) filter (where se.tags <> '{}')), 0) >= $5)
         AND ($6 = -1 OR COALESCE(CARDINALITY(ARRAY_AGG(se.tags) filter (where se.tags <> '{}')), 0) <= $6)
         AND ($7 = -1 OR SUM(CASE WHEN parent_id IS NULL THEN EXTRACT(epoch FROM end_timestamp - start_timestamp)::double precision * 1000 ELSE 0 END) >= $7)
         AND ($8 = -1 OR SUM(CASE WHEN parent_id IS NULL THEN EXTRACT(epoch FROM end_timestamp - start_timestamp)::double precision * 1000 ELSE 0 END) <= $8)
         AND ($9 = -1 OR SUM((attributes ->> 'llm.usage.total_tokens')::integer) >= $9)
         AND ($10 = -1 OR SUM((attributes ->> 'llm.usage.total_tokens')::integer) <= $10)
         AND ((array_length($11::text[], 1) IS NULL) OR ((SELECT ARRAY_AGG(DISTINCT tag)
                                                          FROM (SELECT UNNEST(tags) AS tag
                                                                FROM span_entries se2
                                                                WHERE se2.trace_id = se.trace_id) AS subquery) &&
                                                         $11::text[]))
         AND ((array_length($12::text[], 1) IS NULL) OR (NOT (SELECT ARRAY_AGG(DISTINCT tag)
                                                              FROM (SELECT UNNEST(tags) AS tag
                                                                    FROM span_entries se2
                                                                    WHERE se2.trace_id = se.trace_id) AS subquery) &&
                                                             $12::text[]))
         AND MIN(start_timestamp) >= $13
         AND MIN(start_timestamp) < $14) as traces
;
