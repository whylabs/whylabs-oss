

-- Don't worry, they're stored the same on disk. Doesn't trigger a table rewrite.

ALTER TABLE whylabs.profiles_overall_hypertable ALTER COLUMN org_id TYPE text;
ALTER TABLE whylabs.profiles_overall_hypertable ALTER COLUMN dataset_id TYPE text;
ALTER TABLE whylabs.profiles_overall_hypertable ALTER COLUMN column_name TYPE text;
ALTER TABLE whylabs.profiles_overall_hypertable ALTER COLUMN metric_path TYPE text;

ALTER TABLE whylabs.profiles_segmented_hypertable ALTER COLUMN org_id TYPE text;
ALTER TABLE whylabs.profiles_segmented_hypertable ALTER COLUMN dataset_id TYPE text;
ALTER TABLE whylabs.profiles_segmented_hypertable ALTER COLUMN column_name TYPE text;
ALTER TABLE whylabs.profiles_segmented_hypertable ALTER COLUMN metric_path TYPE text;


