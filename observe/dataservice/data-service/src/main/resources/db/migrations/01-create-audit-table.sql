-- Create Audit table for WhyLogs V1 profile uploads

CREATE TABLE IF NOT EXISTS whylabs.profile_upload_audit (
                                                            id serial PRIMARY KEY,
                                                            s3_path varchar UNIQUE,
                                                            org_id varchar NOT NULL,
                                                            dataset_id varchar NOT NULL,
                                                            dataset_timestamp timestamptz NOT NULL,
                                                            ingest_timestamp timestamptz NOT NULL,
                                                            ingest_method varchar,
                                                            size int,
                                                            reference_id varchar,
                                                            failure varchar
);
COMMENT ON COLUMN whylabs.profile_upload_audit.reference_id IS 'Nullable reference profile id';

CREATE INDEX IF NOT EXISTS profile_upload_audit_idx_s3_path_key on whylabs.profile_upload_audit USING hash(s3_path);
CREATE INDEX IF NOT EXISTS profile_upload_audit_idx_ref_id ON whylabs.profile_upload_audit(org_id, dataset_id, reference_id);

