
WITH val (s3_path, org_id, dataset_id,
          dataset_timestamp, ingest_method, size, ref_id,
          modified_ts, event_ts) AS
         (
            VALUES (:s3Path, :orgId, :datasetId,
                    CAST(:datasetTs as TIMESTAMP), :ingestMethod, CAST(:size as int), :refId,
                    CAST(:modifiedTs as TIMESTAMP), CAST(:eventTs as TIMESTAMP))
--              VALUES (
--                         's3://path',  'org-0', 'model-0',
--                         CAST('2022-11-20T00:00:00.000Z' as TIMESTAMP), 'processing', 45345, 'ref-39ksflksj',
--                         CAST('2022-11-20T00:00:00.000Z' as TIMESTAMP), CAST('2022-11-20T00:00:00.000Z' as TIMESTAMP),
--                     )
         ),

     v as (select * from val)

INSERT INTO whylabs.profile_upload_audit (s3_path, state, org_id, dataset_id,
                                          dataset_timestamp, ingest_method, size, reference_id,
                                          modified_ts, event_ts
                                          )
    SELECT s3_path, CAST('pending' as audit_state_enum), org_id, dataset_id,
           dataset_timestamp, ingest_method, size, ref_id,
           modified_ts, event_ts

    FROM v
ON CONFLICT (s3_path) DO NOTHING


