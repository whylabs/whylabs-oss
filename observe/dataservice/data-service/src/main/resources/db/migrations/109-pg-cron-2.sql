

-- New flow has 2 hops Staging=>Staging_silver=>historical
--
-- Why a silver table? When someone onboards a dataset logged distributed or highly segmented then we can have
-- staging data that's too large to merge at query time so we need to be rolling that up every hour. Data
-- wont be rolled up into the historical tables until the weekend.

create table if not exists whylabs.profiles_overall_staging_silver
(
    id bigserial,
    org_id                 text                                                                       not null,
    dataset_id             text                                                                       not null,
    column_name            text,
    metric_path            text,
    segment_text           jsonb,
    dataset_tags           jsonb,
    dataset_timestamp      timestamp with time zone                                                      not null,
    variance               numeric[],
    d_sum                  numeric,
    d_min                  numeric,
    d_max                  numeric,
    unmergeable_d          numeric,
    n_sum                  bigint,
    n_min                  bigint,
    n_max                  bigint,
    dataset_type           dataset_type_enum                                                             not null,
    mergeable_segment      boolean                                                                       not null,
    kll                    kll_double_sketch,
    hll                    hll_sketch,
    frequent_items         frequent_strings_sketch,
    classification_profile bytea,
    regression_profile     bytea,
    last_upload_ts         timestamp with time zone                                                      not null,
    first_upload_ts        timestamp with time zone,
    trace_id               text,
    profile_id             numeric
);

create index if not exists profiles_detailed_overall_silver_staging_idx
    on whylabs.profiles_overall_staging_silver (org_id, dataset_id, column_name, metric_path, dataset_timestamp);

create index if not exists max_io_staging_silver_idx
    on whylabs.profiles_overall_staging_silver (org_id, dataset_id, dataset_timestamp) include (column_name, n_sum)
    where ((metric_path)::text = 'counts/n'::text);

SELECT create_hypertable('whylabs.profiles_overall_staging_silver','last_upload_ts', chunk_time_interval => interval '7 day', create_default_indexes => FALSE, migrate_data=> TRUE);



create table whylabs.profiles_segmented_staging_silver
(
    id                     bigserial,
    org_id                 text                  not null,
    dataset_id             text                  not null,
    column_name            text,
    metric_path            text,
    segment_text           jsonb,
    dataset_tags           jsonb,
    dataset_timestamp      timestamp with time zone not null,
    variance               numeric[],
    d_sum                  numeric,
    d_min                  numeric,
    d_max                  numeric,
    unmergeable_d          numeric,
    n_sum                  bigint,
    n_min                  bigint,
    n_max                  bigint,
    dataset_type           dataset_type_enum        not null,
    mergeable_segment      boolean                  not null,
    kll                    kll_double_sketch,
    hll                    hll_sketch,
    frequent_items         frequent_strings_sketch,
    classification_profile bytea,
    regression_profile     bytea,
    last_upload_ts         timestamp with time zone not null,
    first_upload_ts        timestamp with time zone,
    trace_id               text,
    profile_id             numeric
);

create index profiles_staging_segmented_siler_org_dataset_col_seg_idx
    on whylabs.profiles_segmented_staging_silver using gin (org_id, dataset_id, column_name, metric_path, dataset_timestamp,
                                                            segment_text jsonb_path_ops);

create index profiles_hypertable_segmented_staging_silver_json
    on whylabs.profiles_segmented_staging_silver using gin (org_id, dataset_id, segment_text, column_name);

create index max_io_segmented_staging_silver_v3_idx
    on whylabs.profiles_segmented_staging_silver (org_id, dataset_id, dataset_timestamp, column_name) include (n_sum, segment_text)
    where ((metric_path)::text = 'counts/n'::text);

create index profiles_segmented_silver_dataset_metric_staging_json
    on whylabs.profiles_segmented_staging_silver using gin (org_id, dataset_id, segment_text, metric_path);

SELECT create_hypertable('whylabs.profiles_segmented_staging_silver','last_upload_ts', chunk_time_interval => interval '7 day', create_default_indexes => FALSE, migrate_data=> TRUE);

--create types

CREATE TYPE system_status AS ENUM ('normal', 'data_promotion_silver_to_historical', 'timescale_compression', 'vacuum');
