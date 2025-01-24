-- How do you bulk load TB+ sized timeseries data? Best option is timescaledb's parallel copy tool. Problem
-- with that thing is it only supports CSV inputs and doesn't give you any option to manipulate or cast
-- data before insert.
--
-- At first we had a staging hypertable that mirrored the CSV file schema as a place to do the initial load
-- but the subsequent query to move the data [insert into target table select * from staging_table] could only
-- move 200MB/s.
--
-- The technique in this file enables us to insert directly into the final table. Way it works is each table
-- has a proxy table with an insert trigger that hits a function which does all the casting/manipulation
-- before inserting into the final destination table. This function returns null which prevents doubling
-- the write traffic due to the proxy table. With this, we're able to peg the IO Throughput on the
-- ebs volume for doing initial loads.
--

------- SEGMENTED -----
CREATE OR REPLACE FUNCTION bulk_proxy_profiles_segmented_hypertable_insert() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    if NEW.dataset_id is null or NEW.dataset_id = '' then
        RETURN null;
    end if;

    INSERT INTO whylabs.profiles_segmented_hypertable (org_id,
                                                       dataset_id,
                                                       column_name,
                                                       metric_path,
                                                       segment_text,
                                                       dataset_tags,
                                                       dataset_timestamp,
                                                       variance,
                                                       d_sum,
                                                       d_min,
                                                       d_max,
                                                       unmergeable_d,
                                                       n_sum,
                                                       n_min,
                                                       n_max,
        --upload_audit,
                                                       dataset_type,
                                                       mergeable_segment,
                                                       kll,
                                                       hll,
                                                       frequent_items,
                                                       classification_profile,
                                                       regression_profile,
                                                       last_upload_ts,
                                                       first_upload_ts
        --original_filename,
        --reference_profile_id
        --ingestion_origin,
        --datalake_write_ts

    ) VALUES
        (
            NULLIF(NULLIF(NEW.org_id, ''), 'null')::varchar,
            NULLIF(NULLIF(NEW.dataset_id, ''), 'null')::varchar,
            NULLIF(NULLIF(NEW.column_name, ''), 'null')::varchar,
            NULLIF(NULLIF(NEW.metric_path, ''), 'null')::varchar,
            array_to_json(string_to_array(NULLIF(NULLIF(NEW.segment_text, ''), 'null'), '&'))::jsonb,
            array_to_json(string_to_array(NULLIF(NULLIF(NEW.dataset_tags, ''), 'null'), '&'))::jsonb,
            NEW.dataset_timestamp::timestamptz,
            case when NULLIF(NULLIF(NEW.variance_0, ''), 'null')::decimal isnull THEN null else array[NULLIF(NULLIF(NEW.variance_0, ''), 'null')::decimal, NULLIF(NULLIF(NEW.variance_1, ''), 'null')::decimal, NULLIF(NULLIF(NEW.variance_2, ''), 'null')::decimal]::decimal[] end,
            NULLIF(NULLIF(NEW.d_sum, ''), 'null')::decimal,
            NULLIF(NULLIF(NEW.d_min, ''), 'null')::decimal,
            NULLIF(NULLIF(NEW.d_max, ''), 'null')::decimal,
            NULLIF(NULLIF(NEW.unmergeable_d, ''), 'null')::numeric,
            NULLIF(NULLIF(NEW.n_sum, ''), 'null')::int8,
            NULLIF(NULLIF(NEW.n_min, ''), 'null')::int8,
            NULLIF(NULLIF(NEW.n_max, ''), 'null')::int8,
            NULLIF(NULLIF(NEW.dataset_type, ''), 'null')::dataset_type_enum,
            NULLIF(NULLIF(NEW.mergeable_segment, ''), 'null')::bool,
            NULLIF(NULLIF(NEW.kll, ''), 'null')::kll_double_sketch,
            NULLIF(NULLIF(NEW.hll, ''), 'null')::hll_sketch,
            NULLIF(NULLIF(NEW.frequent_items, ''), 'null')::frequent_strings_sketch,
            NULLIF(NULLIF(NEW.classification_profile, ''), 'null')::bytea,
            NULLIF(NULLIF(NEW.regression_profile, ''), 'null')::bytea,
            NULLIF(NULLIF(NEW.last_upload_ts, ''), 'null')::timestamptz,
            NULLIF(NULLIF(NEW.last_upload_ts, ''), 'null')::timestamptz
            --NULLIF(NULLIF(NEW.reference_profile_id, ''), 'null')::varchar
        );
    RETURN null;
END $$;

-- All fields in the field list DatalakeRowV1ToCsv
CREATE table IF NOT EXISTS whylabs.bulk_proxy_profiles_segmented_hypertable (org_id varchar, dataset_id varchar, column_name varchar, metric_path varchar, segment_text varchar, dataset_tags varchar, dataset_timestamp timestamptz, variance_0 varchar, variance_1 varchar, variance_2 varchar, d_sum varchar, d_min varchar, d_max varchar, unmergeable_d varchar, n_sum varchar, n_min varchar, n_max varchar, upload_audit varchar, dataset_type varchar, mergeable_segment varchar, kll varchar, hll varchar, frequent_items varchar, classification_profile varchar, regression_profile varchar, last_upload_ts varchar, original_filename varchar, reference_profile_id varchar, ingestion_origin varchar, datalake_write_ts varchar);

SELECT create_hypertable('whylabs.bulk_proxy_profiles_segmented_hypertable', 'dataset_timestamp', chunk_time_interval => interval '1 day', create_default_indexes => FALSE, if_not_exists => TRUE);

CREATE or replace TRIGGER bulk_proxy_profiles_segmented_hypertable_intercept
    BEFORE INSERT ON whylabs.bulk_proxy_profiles_segmented_hypertable
    FOR EACH ROW EXECUTE PROCEDURE bulk_proxy_profiles_segmented_hypertable_insert();


------- OVERALL -----
CREATE OR REPLACE FUNCTION bulk_proxy_profiles_overall_hypertable_insert() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    if NEW.dataset_id is null or NEW.dataset_id = '' then
        RETURN null;
    end if;

    INSERT INTO whylabs.profiles_overall_hypertable (org_id,
                                                       dataset_id,
                                                       column_name,
                                                       metric_path,
                                                       segment_text,
                                                       dataset_tags,
                                                       dataset_timestamp,
                                                       variance,
                                                       d_sum,
                                                       d_min,
                                                       d_max,
                                                       unmergeable_d,
                                                       n_sum,
                                                       n_min,
                                                       n_max,
        --upload_audit,
                                                       dataset_type,
                                                       mergeable_segment,
                                                       kll,
                                                       hll,
                                                       frequent_items,
                                                       classification_profile,
                                                       regression_profile,
                                                       last_upload_ts,
                                                       first_upload_ts
        --original_filename,
        --reference_profile_id TODO: Deal with this
        --ingestion_origin,
        --datalake_write_ts

    ) VALUES
        (
            NULLIF(NULLIF(NEW.org_id, ''), 'null')::varchar,
            NULLIF(NULLIF(NEW.dataset_id, ''), 'null')::varchar,
            NULLIF(NULLIF(NEW.column_name, ''), 'null')::varchar,
            NULLIF(NULLIF(NEW.metric_path, ''), 'null')::varchar,
            array_to_json(string_to_array(NULLIF(NULLIF(NEW.segment_text, ''), 'null'), '&'))::jsonb,
            array_to_json(string_to_array(NULLIF(NULLIF(NEW.dataset_tags, ''), 'null'), '&'))::jsonb,
            NEW.dataset_timestamp::timestamptz,
            case when NULLIF(NULLIF(NEW.variance_0, ''), 'null')::decimal isnull THEN null else array[NULLIF(NULLIF(NEW.variance_0, ''), 'null')::decimal, NULLIF(NULLIF(NEW.variance_1, ''), 'null')::decimal, NULLIF(NULLIF(NEW.variance_2, ''), 'null')::decimal]::decimal[] end,
            NULLIF(NULLIF(NEW.d_sum, ''), 'null')::decimal,
            NULLIF(NULLIF(NEW.d_min, ''), 'null')::decimal,
            NULLIF(NULLIF(NEW.d_max, ''), 'null')::decimal,
            NULLIF(NULLIF(NEW.unmergeable_d, ''), 'null')::numeric,
            NULLIF(NULLIF(NEW.n_sum, ''), 'null')::int8,
            NULLIF(NULLIF(NEW.n_min, ''), 'null')::int8,
            NULLIF(NULLIF(NEW.n_max, ''), 'null')::int8,
            NULLIF(NULLIF(NEW.dataset_type, ''), 'null')::dataset_type_enum,
            NULLIF(NULLIF(NEW.mergeable_segment, ''), 'null')::bool,
            NULLIF(NULLIF(NEW.kll, ''), 'null')::kll_double_sketch,
            NULLIF(NULLIF(NEW.hll, ''), 'null')::hll_sketch,
            NULLIF(NULLIF(NEW.frequent_items, ''), 'null')::frequent_strings_sketch,
            NULLIF(NULLIF(NEW.classification_profile, ''), 'null')::bytea,
            NULLIF(NULLIF(NEW.regression_profile, ''), 'null')::bytea,
            NULLIF(NULLIF(NEW.last_upload_ts, ''), 'null')::timestamptz,
            NULLIF(NULLIF(NEW.last_upload_ts, ''), 'null')::timestamptz
            --NULLIF(NULLIF(NEW.reference_profile_id, ''), 'null')::varchar
        );
    RETURN null;
END $$;

-- All fields in the field list DatalakeRowV1ToCsv
CREATE table IF NOT EXISTS whylabs.bulk_proxy_profiles_overall_hypertable (org_id varchar, dataset_id varchar, column_name varchar, metric_path varchar, segment_text varchar, dataset_tags varchar, dataset_timestamp timestamptz, variance_0 varchar, variance_1 varchar, variance_2 varchar, d_sum varchar, d_min varchar, d_max varchar, unmergeable_d varchar, n_sum varchar, n_min varchar, n_max varchar, upload_audit varchar, dataset_type varchar, mergeable_segment varchar, kll varchar, hll varchar, frequent_items varchar, classification_profile varchar, regression_profile varchar, last_upload_ts varchar, original_filename varchar, reference_profile_id varchar, ingestion_origin varchar, datalake_write_ts varchar);

SELECT create_hypertable('whylabs.bulk_proxy_profiles_overall_hypertable', 'dataset_timestamp', chunk_time_interval => interval '1 day', create_default_indexes => FALSE, if_not_exists => TRUE);

CREATE or replace TRIGGER bulk_proxy_profiles_overall_hypertable_intercept
    BEFORE INSERT ON whylabs.bulk_proxy_profiles_overall_hypertable
    FOR EACH ROW EXECUTE PROCEDURE bulk_proxy_profiles_overall_hypertable_insert();

--------- Reference Profiles ----------------
CREATE OR REPLACE FUNCTION bulk_proxy_profiles_reference_hypertable_insert() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    if NEW.dataset_id is null or NEW.dataset_id = '' then
        RETURN null;
    end if;

    INSERT INTO whylabs.reference_profiles (org_id,
                                            dataset_id,
                                            column_name,
                                            metric_path,
                                            segment_text,
                                            dataset_timestamp,
                                            variance,
                                            d_sum,
                                            d_min,
                                            d_max,
                                            unmergeable_d,
                                            n_sum,
                                            n_min,
                                            n_max,
        --upload_audit,
                                            dataset_type,
                                            mergeable_segment,
                                            kll,
                                            hll,
                                            frequent_items,
                                            classification_profile,
                                            regression_profile,
                                            last_upload_ts,
                                            first_upload_ts,
        --original_filename,
                                            reference_profile_id
        --ingestion_origin,
        --datalake_write_ts

    ) VALUES
        (
            NULLIF(NULLIF(NEW.org_id, ''), 'null')::varchar,
            NULLIF(NULLIF(NEW.dataset_id, ''), 'null')::varchar,
            NULLIF(NULLIF(NEW.column_name, ''), 'null')::varchar,
            NULLIF(NULLIF(NEW.metric_path, ''), 'null')::varchar,
            array_to_json(string_to_array(NULLIF(NULLIF(NEW.segment_text, ''), 'null'), '&'))::jsonb,
            NEW.dataset_timestamp::timestamptz,
            case when NULLIF(NULLIF(NEW.variance_0, ''), 'null')::decimal isnull THEN null else array[NULLIF(NULLIF(NEW.variance_0, ''), 'null')::decimal, NULLIF(NULLIF(NEW.variance_1, ''), 'null')::decimal, NULLIF(NULLIF(NEW.variance_2, ''), 'null')::decimal]::decimal[] end,
            NULLIF(NULLIF(NEW.d_sum, ''), 'null')::decimal,
            NULLIF(NULLIF(NEW.d_min, ''), 'null')::decimal,
            NULLIF(NULLIF(NEW.d_max, ''), 'null')::decimal,
            NULLIF(NULLIF(NEW.unmergeable_d, ''), 'null')::numeric,
            NULLIF(NULLIF(NEW.n_sum, ''), 'null')::int8,
            NULLIF(NULLIF(NEW.n_min, ''), 'null')::int8,
            NULLIF(NULLIF(NEW.n_max, ''), 'null')::int8,
            NULLIF(NULLIF(NEW.dataset_type, ''), 'null')::dataset_type_enum,
            NULLIF(NULLIF(NEW.mergeable_segment, ''), 'null')::bool,
            NULLIF(NULLIF(NEW.kll, ''), 'null')::kll_double_sketch,
            NULLIF(NULLIF(NEW.hll, ''), 'null')::hll_sketch,
            NULLIF(NULLIF(NEW.frequent_items, ''), 'null')::frequent_strings_sketch,
            NULLIF(NULLIF(NEW.classification_profile, ''), 'null')::bytea,
            NULLIF(NULLIF(NEW.regression_profile, ''), 'null')::bytea,
            NULLIF(NULLIF(NEW.last_upload_ts, ''), 'null')::timestamptz,
            NULLIF(NULLIF(NEW.last_upload_ts, ''), 'null')::timestamptz,
            NULLIF(NULLIF(NEW.reference_profile_id, ''), 'null')::varchar
        );
    RETURN null;
END $$;

-- All fields in the field list DatalakeRowV1ToCsv
CREATE table IF NOT EXISTS whylabs.bulk_proxy_reference_profiles_hypertable (org_id varchar, dataset_id varchar, column_name varchar, metric_path varchar, segment_text varchar, dataset_tags varchar, dataset_timestamp timestamptz, variance_0 varchar, variance_1 varchar, variance_2 varchar, d_sum varchar, d_min varchar, d_max varchar, unmergeable_d varchar, n_sum varchar, n_min varchar, n_max varchar, upload_audit varchar, dataset_type varchar, mergeable_segment varchar, kll varchar, hll varchar, frequent_items varchar, classification_profile varchar, regression_profile varchar, last_upload_ts varchar, original_filename varchar, reference_profile_id varchar, ingestion_origin varchar, datalake_write_ts varchar);

SELECT create_hypertable('whylabs.bulk_proxy_reference_profiles_hypertable', 'dataset_timestamp', chunk_time_interval => interval '1 day', create_default_indexes => FALSE, if_not_exists => TRUE);

CREATE or replace TRIGGER bulk_proxy_reference_profiles_hypertable_intercept
    BEFORE INSERT ON whylabs.bulk_proxy_reference_profiles_hypertable
    FOR EACH ROW EXECUTE PROCEDURE bulk_proxy_profiles_reference_hypertable_insert();


--------- Audit Table ----------------
CREATE OR REPLACE FUNCTION bulk_proxy_audit_hypertable_insert() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO whylabs.profile_upload_audit (
        s3_path, org_id, dataset_id, dataset_timestamp, ingest_timestamp, ingest_method, reference_id   ) VALUES
        (
            NULLIF(NULLIF(NEW.original_filename, ''), 'null')::varchar,
            NULLIF(NULLIF(NEW.org_id, ''), 'null')::varchar,
            NULLIF(NULLIF(NEW.dataset_id, ''), 'null')::varchar,
            NEW.dataset_timestamp::timestamptz,
            NEW.datalake_write_ts::timestamptz,
            NULLIF(NULLIF(NEW.ingestion_origin, ''), 'null')::varchar,
            NULLIF(NULLIF(NEW.reference_profile_id, ''), 'null')::varchar
        ) ON CONFLICT DO NOTHING;
    RETURN null;
END $$;

-- All fields in the field list DatalakeRowV1ToCsv
CREATE table IF NOT EXISTS whylabs.bulk_proxy_audit_hypertable (org_id varchar, dataset_id varchar, column_name varchar, metric_path varchar, segment_text varchar, dataset_tags varchar, dataset_timestamp timestamptz, variance_0 varchar, variance_1 varchar, variance_2 varchar, d_sum varchar, d_min varchar, d_max varchar, unmergeable_d varchar, n_sum varchar, n_min varchar, n_max varchar, upload_audit varchar, dataset_type varchar, mergeable_segment varchar, kll varchar, hll varchar, frequent_items varchar, classification_profile varchar, regression_profile varchar, last_upload_ts varchar, original_filename varchar, reference_profile_id varchar, ingestion_origin varchar, datalake_write_ts varchar);

SELECT create_hypertable('whylabs.bulk_proxy_audit_hypertable', 'dataset_timestamp', chunk_time_interval => interval '1 day', create_default_indexes => FALSE, if_not_exists => TRUE);

CREATE or replace TRIGGER bulk_proxy_audit_hypertable_intercept
    BEFORE INSERT ON whylabs.bulk_proxy_audit_hypertable
    FOR EACH ROW EXECUTE PROCEDURE bulk_proxy_audit_hypertable_insert();

--------- Tags Table ------------
CREATE OR REPLACE FUNCTION bulk_proxy_tags_hypertable_insert() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO whylabs.tags (
        org_id, dataset_id, tag_key, tag_value, latest_dataset_timestamp, oldest_dataset_timestamp, latest_upload_timestamp, oldest_upload_timestamp) VALUES
        (
            NULLIF(NULLIF(NEW.org_id, ''), 'null')::varchar,
            NULLIF(NULLIF(NEW.dataset_id, ''), 'null')::varchar,
            NULLIF(NULLIF(NEW.tag_key, ''), 'null')::varchar,
            NULLIF(NULLIF(NEW.tag_value, ''), 'null')::varchar,
            NEW.latest_dataset_timestamp::timestamptz,
            NEW.oldest_dataset_timestamp::timestamptz,
            NULLIF(NEW.latest_upload_timestamp, 'null')::timestamptz,
            NULLIF(NEW.oldest_upload_timestamp, 'null')::timestamptz
        ) ON CONFLICT (org_id, dataset_id, tag_key, tag_value) DO UPDATE set
                                                                                     latest_dataset_timestamp = greatest(tags.latest_dataset_timestamp, excluded.latest_dataset_timestamp::timestamptz),
                                                                                     oldest_dataset_timestamp = least(tags.oldest_dataset_timestamp, excluded.oldest_dataset_timestamp::timestamptz),
                                                                                     latest_upload_timestamp = greatest(tags.latest_upload_timestamp, excluded.latest_upload_timestamp::timestamptz),
                                                                                     oldest_upload_timestamp = least(tags.oldest_upload_timestamp, excluded.oldest_upload_timestamp::timestamptz);

    RETURN null;
END $$;

CREATE table IF NOT EXISTS whylabs.bulk_proxy_tags_hypertable (
                                            org_id varchar NOT NULL,
                                            dataset_id varchar NOT NULL,
                                            tag_key varchar,
                                            tag_value varchar,
                                            latest_dataset_timestamp timestamptz,
                                            oldest_dataset_timestamp timestamptz,
                                            latest_upload_timestamp varchar,
                                            oldest_upload_timestamp varchar
);

SELECT create_hypertable('whylabs.bulk_proxy_tags_hypertable', 'latest_dataset_timestamp', chunk_time_interval => interval '1 day', create_default_indexes => FALSE, if_not_exists => TRUE);

CREATE or replace TRIGGER bulk_proxy_tags_hypertable_intercept
    BEFORE INSERT ON whylabs.bulk_proxy_tags_hypertable
    FOR EACH ROW EXECUTE PROCEDURE bulk_proxy_tags_hypertable_insert();

--------- Legacy segments table

CREATE OR REPLACE FUNCTION bulk_proxy_legacy_segments_hypertable_insert() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    if NEW.dataset_id is null or NEW.dataset_id = '' then
        RETURN null;
    end if;

    insert into whylabs.legacy_segments (org_id, dataset_id, segment_text, latest_dataset_timestamp, oldest_dataset_timestamp, latest_upload_timestamp, oldest_upload_timestamp)
    select
        NULLIF(NULLIF(NEW.org_id, ''), 'null')::varchar,
        NULLIF(NULLIF(NEW.dataset_id, ''), 'null')::varchar,
        array_to_json(string_to_array(NEW.segment_text, ','))::jsonb,
        NULLIF(NULLIF(NEW.latest_dataset_timestamp, ''), 'null')::timestamptz,
        NULLIF(NULLIF(NEW.oldest_dataset_timestamp, ''), 'null')::timestamptz,
        NULLIF(NULLIF(NEW.latest_upload_timestamp, ''), 'null')::timestamptz,
        NULLIF(NULLIF(NEW.oldest_upload_timestamp, ''), 'null')::timestamptz
    ON CONFLICT (org_id, dataset_id, segment_text) DO UPDATE set
                                                                 latest_dataset_timestamp = greatest(legacy_segments.latest_dataset_timestamp, excluded.latest_dataset_timestamp::timestamptz),
                                                                 oldest_dataset_timestamp = least(legacy_segments.oldest_dataset_timestamp, excluded.oldest_dataset_timestamp::timestamptz),
                                                                 latest_upload_timestamp = greatest(legacy_segments.latest_upload_timestamp, excluded.latest_upload_timestamp::timestamptz),
                                                                 oldest_upload_timestamp = least(legacy_segments.oldest_upload_timestamp, excluded.oldest_upload_timestamp::timestamptz);
    RETURN null;
END $$;


CREATE table IF NOT EXISTS whylabs.bulk_proxy_legacy_segments_hypertable (
                                                           org_id varchar NOT NULL,
                                                           dataset_id varchar NOT NULL,
                                                           segment_text varchar,
                                                           latest_dataset_timestamp timestamptz,
                                                           oldest_dataset_timestamp timestamptz,
                                                           latest_upload_timestamp varchar,
                                                           oldest_upload_timestamp varchar
                                                           );

SELECT create_hypertable('whylabs.bulk_proxy_legacy_segments_hypertable', 'latest_dataset_timestamp', chunk_time_interval => interval '1 day', create_default_indexes => FALSE, if_not_exists => TRUE);

CREATE or replace TRIGGER bulk_proxy_legacy_segments_hypertable_intercept
    BEFORE INSERT ON whylabs.bulk_proxy_legacy_segments_hypertable
    FOR EACH ROW EXECUTE PROCEDURE bulk_proxy_legacy_segments_hypertable_insert();