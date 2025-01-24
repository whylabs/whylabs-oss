
-- Separate tables for anomalies vs non-anomalies, each a hypertable
create table whylabs.analysis_anomalies
(
    analyser_result_id bigserial,
    org_id                                  varchar                                                                                      not null,
    dataset_id                              varchar                                                                                      not null,
    column_name                             varchar                                                                                      not null,
    id                                      uuid                                                                                         not null,
    run_id                                  uuid,
    analysis_id                             uuid                                                                                         not null,
    dataset_timestamp                       timestamp with time zone                                                                     not null,
    creation_timestamp                      timestamp with time zone                                                                     not null,
    seasonal_lambda_keep                    numeric,
    seasonal_adjusted_prediction            numeric,
    seasonal_replacement                    numeric,
    drift_metric_value                      numeric,
    diff_metric_value                       numeric,
    drift_threshold                         numeric,
    diff_threshold                          numeric,
    threshold_absolute_upper                numeric,
    threshold_absolute_lower                numeric,
    threshold_factor                        numeric,
    threshold_baseline_metric_value         numeric,
    threshold_metric_value                  numeric,
    threshold_calculated_upper              numeric,
    threshold_calculated_lower              numeric,
    segment_weight                          numeric,
    calculation_runtime_nano                bigint,
    analyzer_version                        integer,
    anomaly_count                           integer                                                                                      not null,
    baseline_count                          integer,
    baseline_batches_with_profile_count     integer,
    target_count                            integer,
    target_batches_with_profile_count       integer,
    expected_baseline_count                 integer,
    expected_baseline_suppression_threshold integer,
    analyzer_config_version                 integer,
    entity_schema_version                   integer,
    weight_config_version                   integer,
    column_list_added                       integer,
    column_list_removed                     integer,
    threshold_min_batch_size                integer,
    monitor_config_version                  integer,
    granularity                             granularity_enum,
    target_level                            target_level_enum,
    diff_mode                               diff_mode_enum,
    column_list_mode                        column_list_mode_enum,
    threshold_type                          threshold_type_enum,
    seasonal_should_replace                 boolean,
    user_initiated_backfill                 boolean,
    is_rollup                               boolean,
    user_marked_unhelpful                   boolean,
    segment                                 varchar,
    analyzer_id                             varchar                                                                                      not null,
    algorithm                               varchar,
    analyzer_type                           varchar,
    metric                                  varchar,
    algorithm_mode                          varchar,
    monitor_ids                             text[],
    column_list_added_sample                text[],
    column_list_removed_sample              text[],
    failure_type                            varchar,
    failure_explanation                     varchar,
    comparison_expected                     varchar,
    comparison_observed                     varchar,
    analyzer_result_type                    varchar,
    tags                                    jsonb,
    image_path                              text,
    reference_profile_id                    text,
    frequent_string_comparison_operator     frequent_string_comparison_operator_enum,
    frequent_string_comparison_sample       text[]
);

CREATE TABLE IF NOT EXISTS whylabs.analysis_non_anomalies
(
    like whylabs.analysis_anomalies including all
);

-- Time sharded hyper tables!
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;
SELECT create_hypertable('whylabs.analysis_non_anomalies', 'dataset_timestamp', chunk_time_interval => interval '7 day', create_default_indexes => FALSE);
SELECT create_hypertable('whylabs.analysis_anomalies','dataset_timestamp', chunk_time_interval => interval '7 day', create_default_indexes => FALSE);

create index analysis_non_anomalies_analysis_id_idx
    on whylabs.analysis_non_anomalies using hash (analysis_id);

create index analysis_non_anomalies_time_idx
    on whylabs.analysis_non_anomalies (org_id, dataset_id, analyzer_id, dataset_timestamp);

create index analysis_anomalies_analysis_id_idx
    on whylabs.analysis_anomalies using hash (analysis_id);

create index analysis_anomalies_time_idx
    on whylabs.analysis_anomalies (org_id, dataset_id, analyzer_id, dataset_timestamp);

-- TODO: We'll want to liquibase-ify these once the container has the community licence pre-baked so it doesn't break the gitlab pipeline (you can't alter the liquibase licence inside a transaction. Liquibase tries to use transactions.)
--SELECT add_reorder_policy('whylabs.analysis_non_anomalies', 'whylogs_analyzer_non_anomalies_time_idx');
--SELECT add_reorder_policy('whylabs.analysis_anomalies', 'analysis_anomalies_time_idx');

-- View that unions anomaly table with the non-anomalies for when you want to query both
create view whylabs.analysis as select * from whylabs.analysis_anomalies union all select * from whylabs.analysis_non_anomalies;