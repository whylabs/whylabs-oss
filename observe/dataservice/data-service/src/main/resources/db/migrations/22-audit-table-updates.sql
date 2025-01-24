-- Add a column to hold last mosified timestamp from original S3 object
alter table whylabs.profile_upload_audit add column modified_ts timestamptz;
