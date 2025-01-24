-- lock pending rows from audit table and mark as processing.
--  Note: `limit 20` below may be replaced at runtime.

WITH updated_audit AS (
  UPDATE whylabs.profile_upload_audit
    SET (state, lock_uuid) = (CAST('processing' as audit_state_enum), cast(:uuid as uuid))
    WHERE id IN (
      SELECT id from whylabs.profile_upload_audit
      WHERE state = cast('pending' as audit_state_enum)
      order by random() FOR UPDATE SKIP LOCKED limit 20)
    RETURNING *)
select * from updated_audit


