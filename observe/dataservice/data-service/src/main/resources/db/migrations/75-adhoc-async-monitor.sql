
DO $$ BEGIN
    create type adhoc_async_status_enum as enum (
        'PENDING',
        'PLANNING',
        'EXECUTING',
        'SUCCESSFUL',
        'FAILED'
        'CANCELED');
    create type adhoc_async_destination_enum as enum (
        'ADHOC_TABLE',
        'ANALYSIS_HYPERTABLES'
        );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

--drop table whylabs.adhoc_async_requests;
--drop table whylabs.adhoc_async_analysis_queue;

CREATE TABLE if not exists whylabs.adhoc_async_requests (
                                                     id                          bigserial PRIMARY KEY,
                                                     org_id                      text,
                                                     dataset_id                  text,
                                                     status                      adhoc_async_status_enum,
                                                     destination                 adhoc_async_destination_enum,
                                                     interval                    text,
                                                     created_timestamp           timestamptz,
                                                     updated_timestamp           timestamptz,
                                                     run_id                      uuid,
                                                     analyzers_configs            jsonb,
                                                     tasks                 numeric,
                                                     tasks_complete        numeric
);

CREATE INDEX IF NOT EXISTS profile_upload_audit_idx_ref_id ON whylabs.adhoc_async_requests(run_id);

CREATE TABLE if not exists whylabs.adhoc_async_analysis_queue (
                                id                          bigserial PRIMARY KEY,
                                run_id     uuid,
                                column_name                 text,
                                segments                   jsonb
);