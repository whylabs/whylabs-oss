drop index whylabs.audit_org_dataset_idx;
CREATE INDEX IF NOT EXISTS audit_org_dataset_idx ON whylabs.profile_upload_audit(org_id, dataset_id, dataset_timestamp) INCLUDE (s3_path);