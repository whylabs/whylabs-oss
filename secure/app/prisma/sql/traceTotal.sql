SELECT COUNT(DISTINCT(trace_id)) as total_traces,
       (EXTRACT(EPOCH FROM MIN(start_timestamp))::double precision * 1000)::bigint AS min_starttime_millis,
       (EXTRACT(EPOCH FROM MAX(end_timestamp))::double precision * 1000)::bigint AS max_endtime_millis
FROM span_entries
WHERE resource_id = $1
  AND start_timestamp >= $2
  AND start_timestamp < $3