SELECT id,
       resource_id,
       trace_id,
       span_id,
       parent_id,
       span_name,
       span_status,
       start_timestamp,
       end_timestamp,
       attributes,
       events,
       links,
       tags,
       start_timebucket,
       ingestion_timestamp,
       resource_attributes,
       (attributes ->> 'llm.usage.total_tokens')::integer AS total_tokens,
       (attributes ->> 'llm.usage.prompt_tokens')::integer AS prompt_tokens,
       (attributes ->> 'llm.usage.completion_tokens')::integer AS completion_tokens,
       (EXTRACT(epoch FROM end_timestamp - start_timestamp)::double precision * 1000)::bigint AS latency
FROM span_entries
WHERE resource_id = $1
  AND trace_id = $2