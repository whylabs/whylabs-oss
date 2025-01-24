
-- reset rows to `pending` if they have been `processing` for too long
-- returns number of modified rows.
UPDATE whylabs.profile_upload_audit
    SET (state, lock_uuid) = (CAST('pending' as audit_state_enum), null)
    WHERE state = cast('processing' as audit_state_enum)
          and (last_updated_ts + INTERVAL  '30 min') < CURRENT_TIMESTAMP






