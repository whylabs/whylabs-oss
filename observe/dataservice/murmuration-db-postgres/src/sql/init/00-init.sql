CREATE EXTENSION IF NOT EXISTS datasketches;
-- Create extension for parquet foreign data wrapper
CREATE EXTENSION IF NOT EXISTS parquet_fdw;

CREATE SCHEMA IF NOT EXISTS whylabs;

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

-- Create table and index for events table


/* These enums should mirror the java pojo values 1:1 */
CREATE TYPE granularity_enum AS ENUM ('HOURS', 'DAYS', 'WEEKS', 'MONTHS');
CREATE TYPE target_level_enum AS ENUM ('column', 'dataset');
CREATE TYPE diff_mode_enum AS ENUM ('abs', 'pct');
CREATE TYPE threshold_type_enum AS ENUM ('upper', 'lower');
CREATE TYPE column_list_mode_enum AS ENUM ('ON_ADD_AND_REMOVE', 'ON_ADD', 'ON_REMOVE');




CREATE TABLE IF NOT EXISTS whylabs.whylogs_analyzer_results (
                                                                analyser_result_id serial PRIMARY KEY,
                                                                org_id varchar NOT NULL,
                                                                dataset_id varchar NOT NULL,
                                                                column_name varchar NOT NULL,
                                                                id uuid NOT NULL,
                                                                run_id uuid,
                                                                analysis_id uuid NOT NULL,
                                                                dataset_timestamp timestamptz NOT NULL,
                                                                creation_timestamp timestamptz NOT NULL,
                                                                seasonal_lambda_keep decimal,
                                                                seasonal_adjusted_prediction decimal,
                                                                seasonal_replacement decimal,
                                                                drift_metric_value decimal,
                                                                diff_metric_value decimal,
                                                                drift_threshold decimal,
                                                                diff_threshold decimal,
                                                                threshold_absolute_upper decimal,
                                                                threshold_absolute_lower decimal,
                                                                threshold_factor decimal,
                                                                threshold_baseline_metric_value decimal,
                                                                threshold_metric_value decimal,
                                                                threshold_calculated_upper decimal,
                                                                threshold_calculated_lower decimal,
                                                                segment_weight decimal,
                                                                calculation_runtime_nano bigint,
                                                                analyzer_version integer,
                                                                anomaly_count integer,
                                                                baseline_count integer,
                                                                baseline_batches_with_profile_count integer,
                                                                target_count integer,
                                                                target_batches_with_profile_count integer,
                                                                expected_baseline_count integer,
                                                                expected_baseline_suppression_threshold integer,
                                                                analyzer_config_version integer,
                                                                entity_schema_version integer,
                                                                weight_config_version integer,
                                                                column_list_added integer,
                                                                column_list_removed integer,
                                                                threshold_min_batch_size integer,
                                                                monitor_config_version integer,
                                                                granularity granularity_enum,
                                                                target_level target_level_enum,
                                                                diff_mode diff_mode_enum,
                                                                column_list_mode column_list_mode_enum,
                                                                threshold_type threshold_type_enum,
                                                                seasonal_should_replace boolean,
                                                                user_initiated_backfill boolean,
                                                                is_rollup boolean,
                                                                user_marked_unhelpful boolean,
                                                                segment varchar,
                                                                analyzer_id varchar NOT NULL,
                                                                algorithm varchar,
                                                                analyzer_type varchar,
                                                                metric varchar,
                                                                algorithm_mode varchar,
                                                                monitor_ids text[],
                                                                column_list_added_sample text[],
                                                                column_list_removed_sample text[],
                                                                failure_type varchar,
                                                                failure_explanation varchar,
                                                                comparison_expected varchar,
                                                                comparison_observed varchar,
                                                                analyzer_result_type varchar,
                                                                tags jsonb,
                                                                image_path text


);

CREATE INDEX IF NOT EXISTS whylogs_analyzer_results_mutable_org_idx ON whylabs.whylogs_analyzer_results(org_id);
CREATE INDEX IF NOT EXISTS whylogs_analyzer_results_mutable_dataset_idx ON whylabs.whylogs_analyzer_results(org_id, dataset_id);
-- Safe to create hash index for columns with lots of unique values
CREATE INDEX IF NOT EXISTS whylogs_analyzer_results_mutable_id_idx ON whylabs.whylogs_analyzer_results USING HASH(id);
CREATE INDEX IF NOT EXISTS whylogs_analyzer_results_mutable_analysis_id_idx ON whylabs.whylogs_analyzer_results USING HASH(analysis_id);



-- Define the functions necessary for using our Variance Tracker triplets into aggretable or
-- calculable values.

-- Aggregate Variance Tracker {count, sum, mean} together.  Given two such vectors, combine their
-- values together, maintaining those definitions.
create or replace function whylabs.agg_variance_tracker_acc(this decimal[3], other decimal[3])
    -- Values and their indexes are stored Count (1), Sum (2), Mean (3)
    -- Copied from the Java code https://github.com/whylabs/whylogs-java/blob/mainline/core/src/main/java/com/whylogs/core/statistics/datatypes/VarianceTracker.java
    returns decimal[3]
as
$BODY$
DECLARE
    delta decimal;
    total_count decimal;
    this_ratio decimal;
    other_ratio decimal;
    result decimal[3];
BEGIN
    if other is null then
        -- because of the INITCOND (defined below), we'll always have a value of {0,0,0} running around during an aggregation
        -- This means that that if we aggregate a null value, we end up with {0,0,0} - conjuring the variane tracker
        -- out of thin air.  However, this tracks with what we were during in Java, as we create the initial
        -- VarianceTracker with 0s and then update those values...
        return this;
    end if;

    -- This seems wrong, but is how we did in the Java VarianceTracker
    if this[1] = 0 then
        return other;
    end if;

    delta := this[3] - other[3];
    total_count := this[1] + other[1];

    -- this.sum += other.sum + Math.pow(delta, 2) * this.count * other.count / (double) totalCount;
    result[2] := this[2] + other[2] + (delta * delta) * (this[1] * other[1]) / total_count;

    this_ratio := this[1] / total_count;
    other_ratio := 1.0 - this_ratio;

    result[3] = this[3] * this_ratio + other[3] * other_ratio;
    result[1] = this[1] + other[1];

    RETURN result;

END
$BODY$
    LANGUAGE plpgsql;

-- Final state of the aggregation. Because we keep the count, sum and mean coherent after each call to the
-- accumulate function, all we have to do is return the final value.
create or replace function whylabs.agg_variance_tracker_final(accumulated decimal[3])
    returns decimal[3]
as
$BODY$
BEGIN
    return accumulated;
END
$BODY$
    LANGUAGE plpgsql ;

-- Tie together the accumulate and final state function so that we can call them within a group-by statement
-- Ex.
-- create table variance_example (
--     id serial primary key,
--     block numeric,
--     variance decimal[3]
-- );
--
-- insert into variance_example (block, variance)
-- values
-- (1, null),
-- (2, ARRAY[1.0, 2.0, 3.0]),
-- (2, ARRAY[5.6, 3.2, 9.2]),
-- (3, ARRAY[0, 3.2, 99]),
-- (4, null),
-- (4, ARRAY[22, 13.4, 7]),
-- (5, ARRAY[31, 22, 1]),
-- (5, null),
-- (6, null),
-- (6, null)
-- ;
--
-- select block, variance_tracker(variance)
-- from variance_example
-- group by block
-- order by block;
create or replace aggregate whylabs.variance_tracker(decimal[3])
(
    INITCOND = '{0, 0, 0}',
    -- TODO: Check out COMBINEFUNC (https://www.postgresql.org/docs/current/sql-createaggregate.html#SQL-CREATEAGGREGATE-NOTES)
    -- Could give perf gains
    STYPE = decimal[3],
    SFUNC = whylabs.agg_variance_tracker_acc,
    FINALFUNC = whylabs.agg_variance_tracker_final
);

-- Convert our Variance Tracker-encoded values into a regular variance
create or replace function whylabs.variance(decimal[3])
    returns decimal
as

'select CASE
            WHEN $1[1] = 0 THEN ''NaN''::NUMERIC
            WHEN $1[1] = 1 THEN 0
            ELSE
                    $1[2] / ($1[1] - 1)
            END;'
    LANGUAGE sql
    immutable
    leakproof
    returns null on null input;


CREATE TYPE backfill_status AS ENUM ('pending', 'canceled', 'in_progress', 'completed');

CREATE TABLE IF NOT EXISTS whylabs.backfill_requests (
                                                         id serial PRIMARY KEY,
                                                         org_id varchar NOT NULL,
                                                         dataset_id varchar NOT NULL,
                                                         overwrite boolean,
                                                         analyzer_ids text[],
                                                         creation_timestamp timestamptz NOT NULL,
                                                         updated_timestamp timestamptz NOT NULL,
                                                         gte timestamptz NOT NULL,
                                                         lt timestamptz NOT NULL,
                                                         status backfill_status,
                                                         requested_by varchar,
                                                         cancelation_requested boolean NOT NULL
);


CREATE TYPE deletion_status_enum AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'CANCELED');

CREATE TABLE IF NOT EXISTS whylabs.profile_deletions (
                                                         id serial PRIMARY KEY,
                                                         org_id varchar NOT NULL,
                                                         dataset_id varchar NOT NULL,
                                                         delete_gte timestamptz,
                                                         delete_lt timestamptz,
                                                         before_upload_ts timestamptz,
                                                         rows_affected integer,
                                                         creation_timestamp timestamptz NOT NULL,
                                                         updated_timestamp timestamptz NOT NULL,
                                                         status deletion_status_enum
);

CREATE TABLE IF NOT EXISTS whylabs.analyzer_result_deletions (
                                                                 id serial PRIMARY KEY,
                                                                 org_id varchar NOT NULL,
                                                                 dataset_id varchar NOT NULL,
                                                                 delete_gte timestamptz,
                                                                 delete_lt timestamptz,
                                                                 rows_affected integer,
                                                                 creation_timestamp timestamptz NOT NULL,
                                                                 updated_timestamp timestamptz NOT NULL,
                                                                 status deletion_status_enum
);



CREATE TYPE monitor_run_status_enum AS ENUM (  'REQUESTED', 'COMPLETED', 'FAILED');

CREATE TABLE IF NOT EXISTS whylabs.analyzer_runs (
                                                     id uuid NOT NULL PRIMARY KEY,
                                                     org_id varchar NOT NULL,
                                                     dataset_id varchar NOT NULL,
                                                     created_ts timestamptz,
                                                     started_ts timestamptz,
                                                     completed_ts timestamptz,
                                                     status monitor_run_status_enum,
                                                     run_id UUID,
                                                     internal_error_message text,
                                                     analyzer_id text,
                                                     baseline_batches_with_profile_count integer,
                                                     target_batches_with_profile_count integer,
                                                     columns_analyzed integer,
                                                     anomalies integer,
                                                     failure_types text[],
                                                     force_latest_config_version bool,
                                                     analyzer_version integer,
                                                     monitor_ids text[],
                                                     segments_analyzed integer,
                                                     customer_requested_backfill bool

);
