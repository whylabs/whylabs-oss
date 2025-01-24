-- These columns aren't consistently populated in the datalake, so we need to allow nulls for historical reason

ALTER TABLE whylabs.profile_upload_audit ALTER COLUMN org_id DROP NOT NULL;
ALTER TABLE whylabs.profile_upload_audit ALTER COLUMN dataset_id DROP NOT NULL;
