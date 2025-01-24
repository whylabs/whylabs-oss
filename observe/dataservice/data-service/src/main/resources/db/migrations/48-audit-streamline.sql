
-- state enum indicates profile ingestion state
-- Java type ai.whylabs.dataservice.streaming.IngestState
CREATE TYPE audit_state_enum AS ENUM ('pending', 'processing', 'ingested', 'failed');
alter table whylabs.profile_upload_audit add column state audit_state_enum;

-- partial index to speed typical scanning
CREATE INDEX IF NOT EXISTS audit_pending_idx ON whylabs.profile_upload_audit (state) WHERE state = 'pending';
CREATE INDEX IF NOT EXISTS audit_processing_idx ON whylabs.profile_upload_audit (state) WHERE state = 'processing';


-- lock_uuid indicates uuid passed down when state was changed to `processing`
alter table whylabs.profile_upload_audit add column lock_uuid uuid;

-- ingest_timestamp is null until ingestion is complete
alter table whylabs.profile_upload_audit alter column ingest_timestamp drop not null;

-- last_update_ts indicates when row was last modified
alter table whylabs.profile_upload_audit add column last_updated_ts timestamptz default CURRENT_TIMESTAMP not null;

-- create function to set `last_updated_ts` when `whylabs.profile_upload_audit` is updated
CREATE  FUNCTION update_last_updated_ts_task()
    RETURNS TRIGGER AS $$
BEGIN
    NEW.last_updated_ts = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- create trigger to set `last_updated_ts` when `whylabs.profile_upload_audit` is updated
CREATE TRIGGER update_user_task_updated_on
    BEFORE UPDATE
    ON
        whylabs.profile_upload_audit
    FOR EACH ROW
EXECUTE PROCEDURE update_last_updated_ts_task();

-- full index to speed state distribution metrics
CREATE INDEX IF NOT EXISTS audit_state_idx ON whylabs.profile_upload_audit(last_updated_ts, state) ;

-- function to raise exception; RAISE is plpgsql and must be wrapped in function if used in SQL
CREATE OR REPLACE FUNCTION raise_exception(anyelement, text) RETURNS anyelement AS $$
BEGIN
    RAISE EXCEPTION '%',$2;
--     RETURN $1;
END;
$$ LANGUAGE plpgsql VOLATILE;
