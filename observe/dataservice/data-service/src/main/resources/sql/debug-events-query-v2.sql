select cast(content as text),
       cast(segment_tags as text),
       creation_timestamp,
       dataset_timestamp,
       trace_id,
       cast(array_to_json(tags) as text) as tags
from whylabs.debug_events d
where d.org_id = :orgId
  AND d.dataset_id = :datasetId
  AND d.dataset_timestamp >= CAST(:startTS as TIMESTAMP) at time zone 'UTC'
  AND d.dataset_timestamp < CAST(:endTS as TIMESTAMP) at time zone 'UTC'
  AND (:traceId is NULL OR d.trace_id = :traceId)
  AND (:segmentTags is NULL
    OR array_length(Cast(:segmentTags as text[]), 1) = 0
    OR CAST(array_to_json(Cast(:segmentTags as text[])) as jsonb) <@ d.segment_tags)
  AND (:tags IS NULL OR ARRAY_LENGTH(CAST(:tags as text[]), 1) = 0 OR CAST(:tags as text[]) <@ d.tags)
order by creation_timestamp desc
limit :limit offset :offset