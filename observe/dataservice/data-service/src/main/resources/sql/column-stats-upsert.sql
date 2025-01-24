-- Upsert column_stats. Note, that table has an insert trigger that prevents duplicate records so that
-- the SQL here doesn't have to rely on 'on conflict' semantics which aren't available on this table
-- because jsonb doesn't support unique clauses.

DELETE FROM  whylabs.columns_new_arrival_queue  WHERE id = any (
    SELECT id FROM whylabs.columns_new_arrival_queue
        FOR UPDATE SKIP LOCKED
    LIMIT 1000
) RETURNING org_id, dataset_id, column_names, earliest_ingest_timestamp, dataset_timestamp, segment_text

