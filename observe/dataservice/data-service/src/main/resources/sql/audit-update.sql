
WITH val (s3_path, audit_state, org_id, dataset_id,
          dataset_timestamp, ingest_method, size, ref_id,
          modified_ts, event_ts,
          ingest_start_ts, ingest_end_ts, uuid, trace_id, segment_tags) AS
         (
            VALUES (:s3Path, CAST(:auditState as audit_state_enum), :orgId, :datasetId,
                    CAST(:datasetTs as TIMESTAMP), :ingestMethod, CAST(:size as int), :refId,
                    CAST(:modifiedTs as TIMESTAMP), CAST(:eventTs as TIMESTAMP),
                    CAST(:ingestStartTs as TIMESTAMP), CAST(:ingestEndTs as TIMESTAMP),
                    CAST(:uuid as uuid),
                    :traceId,
                    cast(:segmentTags as jsonb)
                    )
--              VALUES (
--                         's3://path', CAST('pending' as audit_state_enum), 'org-0', 'model-0',
--                         CAST('2022-11-20T00:00:00.000Z' as TIMESTAMP), 'processing', 45345, 'ref-39ksflksj',
--                         CAST('2022-11-20T00:00:00.000Z' as TIMESTAMP), CAST('2022-11-20T00:00:00.000Z' as TIMESTAMP),
--                         CAST('2022-11-20T00:00:00.000Z' as TIMESTAMP), CAST('2022-11-20T00:00:00.000Z' as TIMESTAMP),
--                         'B0EEBC99-9C0B-4EF8-BB6D-6BB9BD380A11'::uuid
--                     )
         ),

     v as (select * from val)

INSERT INTO whylabs.profile_upload_audit (s3_path, state, org_id, dataset_id,
                                          dataset_timestamp, ingest_method, size, reference_id,
                                          modified_ts, event_ts,
                                          ingest_start_ts, ingest_timestamp, lock_uuid, trace_id, segment_tags)
    SELECT s3_path, audit_state, org_id, dataset_id,
           dataset_timestamp, ingest_method, size, ref_id,
           modified_ts, event_ts,
           ingest_start_ts, ingest_end_ts, uuid, trace_id, segment_tags
    FROM v
--     where whylabs.profile_upload_audit.s3_path = s3_path and whylabs.profile_upload_audit.lock_uuid = v.uuid
ON CONFLICT (s3_path) DO
    UPDATE SET (state, lock_uuid, size, ingest_start_ts, ingest_timestamp, modified_ts, trace_id, segment_tags) = (
    case
        -- do not update legacy rows - should not happen
        when whylabs.profile_upload_audit.state is null then raise_exception( whylabs.profile_upload_audit.state, 'updating legacy')
        else excluded.state
    end,
    case
        -- do not steal locks that aren't yours
        when whylabs.profile_upload_audit.lock_uuid is not null
                 AND excluded.lock_uuid<>whylabs.profile_upload_audit.lock_uuid then raise_exception( profile_upload_audit.lock_uuid, 'stealing lock')
        else excluded.lock_uuid
        end,
    COALESCE(excluded.size, whylabs.profile_upload_audit.size),
    COALESCE(excluded.ingest_start_ts, whylabs.profile_upload_audit.ingest_start_ts),
    COALESCE(excluded.ingest_timestamp, whylabs.profile_upload_audit.ingest_timestamp),
    COALESCE(excluded.modified_ts, whylabs.profile_upload_audit.modified_ts),
    COALESCE(excluded.trace_id, whylabs.profile_upload_audit.trace_id),
    COALESCE(excluded.segment_tags, whylabs.profile_upload_audit.segment_tags)
        )

