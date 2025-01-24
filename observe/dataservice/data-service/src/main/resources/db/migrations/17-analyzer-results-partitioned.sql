drop table if exists whylabs.whylogs_analyzer_results;

create table whylabs.whylogs_analyzer_results
(
    analyser_result_id                      serial,
    org_id                                  varchar                  not null,
    dataset_id                              varchar                  not null,
    column_name                             varchar                  not null,
    id                                      uuid                     not null,
    run_id                                  uuid,
    analysis_id                             uuid                     not null,
    dataset_timestamp                       timestamp with time zone not null,
    creation_timestamp                      timestamp with time zone not null,
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
    anomaly_count                           integer,
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
    analyzer_id                             varchar                  not null,
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
    frequent_string_comparison_sample       text[],
    PRIMARY KEY (analyser_result_id, anomaly_count)
) PARTITION BY RANGE(anomaly_count);

-- Most queries only care about anomalies which are a fraction of the overall, so we break them out into a partition
CREATE TABLE analyzer_results_0 PARTITION OF whylabs.whylogs_analyzer_results
    FOR VALUES FROM (0) TO (1);

CREATE TABLE analyzer_results_1 PARTITION OF whylabs.whylogs_analyzer_results
    FOR VALUES FROM (1) TO (2);

CREATE INDEX IF NOT EXISTS whylogs_analyzer_results_dataset_idx ON whylabs.whylogs_analyzer_results(org_id, dataset_id);
CREATE INDEX IF NOT EXISTS whylogs_analyzer_results_analysis_id_idx ON whylabs.whylogs_analyzer_results USING HASH(analysis_id);
CREATE INDEX IF NOT EXISTS analyzer_result_analyzer_time ON whylabs.whylogs_analyzer_results (org_id, dataset_id, analyzer_id, dataset_timestamp);