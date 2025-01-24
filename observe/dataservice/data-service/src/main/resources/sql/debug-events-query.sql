WITH parameters (orgId, datasetId, startTS, endTS, traceId) as (
    --values ('org-0',  'model-0', to_timestamp(16787000000/1000),to_timestamp(16780838400000/1000), CAST('{}' as text[]))),

    values (:orgId, :datasetId,
            CAST(:startTS as TIMESTAMP)  at time zone 'UTC',
            CAST(:endTS as TIMESTAMP)  at time zone 'UTC',
            :traceId
           )
)

select cast(content as text), cast(segment_tags as text), creation_timestamp, dataset_timestamp, trace_id, cast(tags as text[])   from whylabs.debug_events d CROSS JOIN parameters p
where d.org_id = p.orgId
  AND d.dataset_id = p.datasetId
  AND d.dataset_timestamp >= p.startTS
  AND d.dataset_timestamp < p.endTS
  AND (p.traceId is NULL OR trace_id = p.traceId)
order by creation_timestamp desc
limit :limit offset :offset
