-- Create the table for WhyLogs V1 profiles
CREATE TYPE dataset_type_enum AS ENUM ('column', 'dataset');

CREATE TABLE IF NOT EXISTS whylabs.whylogs_profiles_v1 (
                                                           id bigserial,
                                                           org_id varchar NOT NULL,
    -- TODO: Find out if we have defined restrictions for these values
                                                           dataset_id varchar NOT NULL,
    -- Column name can be null if this is a dataset. Could add constraint check.
                                                           column_name varchar,
    -- how long can custom metric paths be?
                                                           metric_path varchar,
                                                           segment_text jsonb,
                                                           tags jsonb,
                                                           dataset_timestamp timestamptz NOT NULL,
                                                           variance decimal[3],
                                                           d_sum decimal,
                                                           d_min decimal,
                                                           d_max decimal,
                                                           unmergeable_d decimal,
                                                           n_sum bigint,
                                                           n_min bigint,
                                                           n_max bigint,
    -- TODO: Specify precision
                                                           upload_audit integer REFERENCES whylabs.profile_upload_audit(id),
                                                           dataset_type dataset_type_enum NOT NULL,
                                                           mergeable_segment boolean NOT NULL,
    -- Should kll, hll, frequent_items sketches and classification_profile
    -- and regression_profile be stored in another table?
                                                           kll kll_double_sketch,
                                                           hll hll_sketch,
                                                           frequent_items frequent_strings_sketch,
                                                           classification_profile bytea,
                                                           regression_profile bytea,
                                                           PRIMARY KEY (id, org_id)
)
    PARTITION BY LIST(org_id);

COMMENT ON COLUMN whylabs.whylogs_profiles_v1.upload_audit IS 'Reference to audit of this profile upload';
COMMENT ON COLUMN whylabs.whylogs_profiles_v1.dataset_timestamp IS 'Dataset timestamp';
COMMENT ON COLUMN whylabs.whylogs_profiles_v1.org_id IS 'Organization ID';
COMMENT ON COLUMN whylabs.whylogs_profiles_v1.dataset_id IS 'Dataset ID';
COMMENT ON COLUMN whylabs.whylogs_profiles_v1.dataset_type IS 'DATASET or COLUMN';
COMMENT ON COLUMN whylabs.whylogs_profiles_v1.column_name IS 'Name of column in dataset';
COMMENT ON COLUMN whylabs.whylogs_profiles_v1.metric_path IS 'WhyLogs metric path';
COMMENT ON COLUMN whylabs.whylogs_profiles_v1.mergeable_segment IS 'Can include this row when calculating dynamic segment values';
COMMENT ON COLUMN whylabs.whylogs_profiles_v1.segment_text IS 'Collection of key-values defining the segment of this row';
COMMENT ON COLUMN whylabs.whylogs_profiles_v1.tags IS 'Additional operational key-values for this row';
COMMENT ON COLUMN whylabs.whylogs_profiles_v1.kll IS 'Binary representation of KLL sketch';
COMMENT ON COLUMN whylabs.whylogs_profiles_v1.hll IS 'Binary representation of HLL sketch';
COMMENT ON COLUMN whylabs.whylogs_profiles_v1.frequent_items IS 'Binary representation of frequent items';
COMMENT ON COLUMN whylabs.whylogs_profiles_v1.n_sum IS 'Sum storage for integral values';
COMMENT ON COLUMN whylabs.whylogs_profiles_v1.n_min IS 'Minimum integral value seen for this column';
COMMENT ON COLUMN whylabs.whylogs_profiles_v1.n_max IS 'Maximum integral value seen for this column';
COMMENT ON COLUMN whylabs.whylogs_profiles_v1.d_sum IS 'Sum storage for decimal values';
COMMENT ON COLUMN whylabs.whylogs_profiles_v1.d_min IS 'Minimum decimal value seen for this column';
COMMENT ON COLUMN whylabs.whylogs_profiles_v1.d_max IS 'Maximum decimal value seen for this column';
-- TODO: Add this column comment
COMMENT ON COLUMN whylabs.whylogs_profiles_v1.unmergeable_d IS 'Comment TBD';
COMMENT ON COLUMN whylabs.whylogs_profiles_v1.variance IS 'Variance of this column values (count, sum, mean)';
COMMENT ON COLUMN whylabs.whylogs_profiles_v1.classification_profile IS 'Binary representation of classification profile';
COMMENT ON COLUMN whylabs.whylogs_profiles_v1.regression_profile IS 'Binary representation of regression profile';

CREATE INDEX IF NOT EXISTS profiles_v1_orgid_idx ON whylabs.whylogs_profiles_v1(org_id);
CREATE INDEX IF NOT EXISTS profiles_v1_dataset_timestamp_idx ON whylabs.whylogs_profiles_v1 using BRIN(dataset_timestamp);
CREATE INDEX IF NOT EXISTS profiles_v1_column_name_idx ON whylabs.whylogs_profiles_v1(column_name);
CREATE INDEX IF NOT EXISTS audit_org_dataset_idx ON whylabs.profile_upload_audit(org_id, dataset_id);


-- Create default partition, into which all org_ids will go by default
CREATE TABLE whylabs.whylogs_profiles_v1_default PARTITION OF whylabs.whylogs_profiles_v1 DEFAULT;

CREATE TABLE IF NOT EXISTS whylabs.reference_profiles
(
    like whylabs.whylogs_profiles_v1 including all
);
