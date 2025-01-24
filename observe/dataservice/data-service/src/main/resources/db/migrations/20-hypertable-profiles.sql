-- Note: Any schema change here needs to be applied to all 4 tables
-- profiles_segmented_staging - Landing area before merge
-- profiles_overall_staging  - Landing area before merge for overall segment
-- profiles_segmented_hypertable - Timescale DB segmented time partitioned
-- profiles_overall_hypertable - Timescale DB segmented time partitioned
create table whylabs.profiles_segmented_staging
(
    id bigserial,
    org_id                 varchar                                                                 not null,
    dataset_id             varchar                                                                 not null,
    column_name            varchar,
    metric_path            varchar,
    segment_text           jsonb,
    dataset_tags           jsonb,
    dataset_timestamp      timestamp with time zone                                                not null,
    variance               numeric[],
    d_sum                  numeric,
    d_min                  numeric,
    d_max                  numeric,
    unmergeable_d          numeric,
    n_sum                  bigint,
    n_min                  bigint,
    n_max                  bigint,
    dataset_type           dataset_type_enum                                                       not null,
    mergeable_segment      boolean                                                                 not null,
    kll                    kll_double_sketch,
    hll                    hll_sketch,
    frequent_items         frequent_strings_sketch,
    classification_profile bytea,
    regression_profile     bytea,
    last_upload_ts         timestamp with time zone,
    first_upload_ts        timestamp with time zone
);

comment on column whylabs.profiles_segmented_staging.org_id is 'Organization ID';
comment on column whylabs.profiles_segmented_staging.dataset_id is 'Dataset ID';
comment on column whylabs.profiles_segmented_staging.column_name is 'Name of column in dataset';
comment on column whylabs.profiles_segmented_staging.metric_path is 'WhyLogs metric path';
comment on column whylabs.profiles_segmented_staging.segment_text is 'Collection of key-values defining the segment of this row';
comment on column whylabs.profiles_segmented_staging.dataset_tags is 'Additional operational key-values for this row';
comment on column whylabs.profiles_segmented_staging.dataset_timestamp is 'Dataset timestamp';
comment on column whylabs.profiles_segmented_staging.variance is 'Variance of this column values (count, sum, mean)';
comment on column whylabs.profiles_segmented_staging.d_sum is 'Sum storage for decimal values';
comment on column whylabs.profiles_segmented_staging.d_min is 'Minimum decimal value seen for this column';
comment on column whylabs.profiles_segmented_staging.d_max is 'Maximum decimal value seen for this column';
comment on column whylabs.profiles_segmented_staging.unmergeable_d is 'Comment TBD';
comment on column whylabs.profiles_segmented_staging.n_sum is 'Sum storage for integral values';
comment on column whylabs.profiles_segmented_staging.n_min is 'Minimum integral value seen for this column';
comment on column whylabs.profiles_segmented_staging.n_max is 'Maximum integral value seen for this column';
comment on column whylabs.profiles_segmented_staging.dataset_type is 'DATASET or COLUMN';
comment on column whylabs.profiles_segmented_staging.mergeable_segment is 'Can include this row when calculating dynamic segment values';
comment on column whylabs.profiles_segmented_staging.kll is 'Binary representation of KLL sketch';
comment on column whylabs.profiles_segmented_staging.hll is 'Binary representation of HLL sketch';
comment on column whylabs.profiles_segmented_staging.frequent_items is 'Binary representation of frequent items';
comment on column whylabs.profiles_segmented_staging.classification_profile is 'Binary representation of classification profile';
comment on column whylabs.profiles_segmented_staging.regression_profile is 'Binary representation of regression profile';

CREATE TABLE IF NOT EXISTS whylabs.profiles_overall_staging
(
    like whylabs.profiles_segmented_staging including all
);
CREATE TABLE IF NOT EXISTS whylabs.profiles_segmented_hypertable
(
    like whylabs.profiles_segmented_staging including all
);
CREATE TABLE IF NOT EXISTS whylabs.profiles_overall_hypertable
(
    like whylabs.profiles_segmented_staging including all
);

-- HYPER TABLE!! Auto-date partition the historical tables
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;
SELECT create_hypertable('whylabs.profiles_segmented_hypertable','dataset_timestamp', chunk_time_interval => interval '7 day', create_default_indexes => FALSE);
SELECT create_hypertable('whylabs.profiles_overall_hypertable','dataset_timestamp', chunk_time_interval => interval '7 day', create_default_indexes => FALSE);

SET max_parallel_workers = 16;
SET max_parallel_maintenance_workers = 8;

-- Overall Indexes
create index profiles_detailed_overall_staging_idx
    on whylabs.profiles_overall_staging (org_id, dataset_id, column_name, metric_path, dataset_timestamp);
create index profiles_detailed_overall_hypertable_idx
    on whylabs.profiles_overall_hypertable (org_id, dataset_id, column_name, metric_path, dataset_timestamp);

-- Segmented Indexes
CREATE EXTENSION IF NOT EXISTS btree_gin;
CREATE INDEX IF NOT EXISTS profiles_staging_segmented_org_dataset_col_seg_idx
    ON whylabs.profiles_segmented_staging USING gin
    (org_id, dataset_id, column_name, metric_path, dataset_timestamp, segment_text jsonb_path_ops);
CREATE INDEX IF NOT EXISTS profiles_hypertable_segmented_org_dataset_col_seg_idx
    ON whylabs.profiles_segmented_hypertable USING gin
    (org_id, dataset_id, column_name, metric_path, dataset_timestamp, segment_text jsonb_path_ops);

-- View that unions the staging and hyper table together
create view whylabs.profiles_segmented as select * from whylabs.profiles_segmented_staging union all select * from whylabs.profiles_segmented_hypertable;
create view whylabs.profiles_overall as select * from whylabs.profiles_overall_staging union all select * from whylabs.profiles_overall_hypertable;

-- TODO: Enable these in liquibase after the container has the license set automatically
-- Set the licence or add_reorder_policy will throw an exception
-- Enable background tasks to re-order chunks in the hypertables as they're created
-- SELECT add_reorder_policy('whylabs.profiles_overall_hypertable', 'profiles_detailed_overall_hypertable_idx');
-- SELECT add_reorder_policy('whylabs.profiles_segmented_hypertable', 'profiles_hypertable_segmented_org_dataset_col_seg_idx');

-- TODO: Enable after testing?
--create index profiles_max_io_idx
--    on whylabs.profiles_segmented_hypertable (org_id, dataset_id, dataset_timestamp);




