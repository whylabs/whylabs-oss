-- MaxIo endpoint is painfully slow without an index
CREATE INDEX  max_io_index ON whylabs.whylogs_profiles_v1 (org_id, dataset_id, dataset_timestamp);