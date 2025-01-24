-- We used to take parquet snapshots and load them in, but it was problematic having long
-- lived connections/transactions trying to atomically swap out old analysis with new.
-- The new technique works much like profile bulk loading in that we ditch parquet
-- and use bulk loading proxy functions. Main diff here is using json which
-- gives us a cleaner schema evolution story on a table that we expect to grow. We
-- also have a chance to make updating analysis idempotent irregardless of
-- whether they were a snap shot or generated fresh in an events job.


-- Helper method to convert json arrays to text arrays
CREATE OR REPLACE FUNCTION jsonb_array_to_text_array(_js jsonb)
    RETURNS text[]
    LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE AS
'SELECT ARRAY(SELECT jsonb_array_elements_text(_js))';


CREATE OR REPLACE FUNCTION bulk_analysis_proxy_function() RETURNS trigger LANGUAGE plpgsql AS $$

BEGIN

    -- Delete from both tables as the analysis' anomaly status may have changed. This makes
    -- writing analyzer results idempotent so we don't have to worry about dupes. Imagine someone
    -- deletes some analyzer results in deltalake and rebuilds them, we need to replace
    -- with the latest.
    delete from whylabs.analysis_anomalies where analysis_anomalies.analysis_id = (NEW.json_blob->>'analysis_id')::uuid;
    delete from whylabs.analysis_non_anomalies where analysis_non_anomalies.analysis_id = (NEW.json_blob->>'analysis_id')::uuid;

    if (NEW.json_blob->>'org_id') is null or (NEW.json_blob->>'org_id') = '' then
        RETURN null;
    end if;

    -- Cast the json appropriately
    with r as (
        select
        (NEW.json_blob->>'org_id')::varchar as org_id,
        (NEW.json_blob->>'dataset_id')::varchar as dataset_id,
        (NEW.json_blob->>'column')::varchar as column_name,
        (NEW.json_blob->>'id')::uuid as id,
        (NEW.json_blob->>'run_id')::uuid as run_id,
        (NEW.json_blob->>'analysis_id')::uuid as analysis_id,
        to_timestamp((NEW.json_blob->>'dataset_timestamp')::numeric/ 1000) as dataset_timestamp,
        to_timestamp((NEW.json_blob->>'creation_timestamp')::numeric/ 1000) as creation_timestamp,
        (NEW.json_blob->>'seasonal_lambda_keep')::numeric as seasonal_lambda_keep,
        (NEW.json_blob->>'seasonal_adjusted_prediction')::numeric as seasonal_adjusted_prediction,
        (NEW.json_blob->>'seasonal_replacement')::numeric as seasonal_replacement,
        (NEW.json_blob->>'drift_metric_value')::numeric as drift_metric_value,
        (NEW.json_blob->>'diff_metric_value')::numeric as diff_metric_value,
        (NEW.json_blob->>'drift_threshold')::numeric as drift_threshold,
        (NEW.json_blob->>'diff_threshold')::numeric as diff_threshold,
        (NEW.json_blob->>'threshold_absolute_upper')::numeric as threshold_absolute_upper,
        (NEW.json_blob->>'threshold_absolute_lower')::numeric as threshold_absolute_lower,
        (NEW.json_blob->>'threshold_factor')::numeric as threshold_factor,
        (NEW.json_blob->>'threshold_baseline_metric_value')::numeric as threshold_baseline_metric_value,
        (NEW.json_blob->>'threshold_metric_value')::numeric as threshold_metric_value,
        (NEW.json_blob->>'threshold_calculated_upper')::numeric as threshold_calculated_upper,
        (NEW.json_blob->>'threshold_calculated_lower')::numeric as threshold_calculated_lower,
        (NEW.json_blob->>'segment_weight')::numeric as segment_weight,
        (NEW.json_blob->>'calculation_runtime_nano')::bigint as calculation_runtime_nano,
        (NEW.json_blob->>'analyzer_version')::integer as analyzer_version,
        (NEW.json_blob->>'baseline_count')::integer as baseline_count,
        (NEW.json_blob->>'baseline_batches_with_profile_count')::integer as baseline_batches_with_profile_count,
        (NEW.json_blob->>'target_count')::integer as target_count,
        (NEW.json_blob->>'target_batches_with_profile_count')::integer as target_batches_with_profile_count,
        (NEW.json_blob->>'expected_baseline_count')::integer as expected_baseline_count,
        (NEW.json_blob->>'expected_baseline_suppression_threshold')::integer as expected_baseline_suppression_threshold,
        (NEW.json_blob->>'analyzer_config_version')::integer as analyzer_config_version,
        (NEW.json_blob->>'entity_schema_version')::integer as entity_schema_version,
        (NEW.json_blob->>'weight_config_version')::integer as weight_config_version,
        (NEW.json_blob->>'column_list_added')::integer as column_list_added,
        (NEW.json_blob->>'column_list_removed')::integer as column_list_removed,
        (NEW.json_blob->>'threshold_min_batch_size')::integer as threshold_min_batch_size,
        (NEW.json_blob->>'monitor_config_version')::integer as monitor_config_version,
        upper(NEW.json_blob->>'granularity')::granularity_enum as granularity,
        lower(NEW.json_blob->>'target_level')::target_level_enum as target_level,
        lower(NEW.json_blob->>'diff_mode')::diff_mode_enum as diff_mode,
        upper(NEW.json_blob->>'column_list_mode')::column_list_mode_enum as column_list_mode,
        lower(NEW.json_blob->>'threshold_type')::threshold_type_enum as threshold_type,
        (NEW.json_blob->>'seasonal_should_replace')::boolean as seasonal_should_replace,
        (NEW.json_blob->>'user_initiated_backfill')::boolean as user_initiated_backfill,
        (NEW.json_blob->>'is_rollup')::boolean as is_rollup,
        (NEW.json_blob->>'user_marked_unhelpful')::boolean as user_marked_unhelpful,
        (NEW.json_blob->>'segment')::varchar as segment,
        (NEW.json_blob->>'analyzer_id')::varchar as analyzer_id,
        (NEW.json_blob->>'algorithm')::varchar as algorithm,
        (NEW.json_blob->>'analyzer_type')::varchar as analyzer_type,
        (NEW.json_blob->>'metric')::varchar as metric,
        (NEW.json_blob->>'algorithm_mode')::varchar as algorithm_mode,
        jsonb_array_to_text_array(NEW.json_blob#>'{monitor_ids}')::text[] as monitor_ids,
        case when jsonb_typeof(NEW.json_blob#>'{column_list_added_sample}') ='null' then null else jsonb_array_to_text_array(NEW.json_blob#>'{column_list_added_sample}')::text[] end as column_list_added_sample,
        case when jsonb_typeof(NEW.json_blob#>'{column_list_removed_sample}') ='null' then null else jsonb_array_to_text_array(NEW.json_blob#>'{column_list_removed_sample}')::text[] end as column_list_removed_sample,
        case when jsonb_typeof(NEW.json_blob#>'{frequent_string_comparison_sample}') ='null' then null else jsonb_array_to_text_array(NEW.json_blob#>'{frequent_string_comparison_sample}')::text[] end as frequent_string_comparison_sample,
        (NEW.json_blob->>'failure_type')::varchar as failure_type,
        (NEW.json_blob->>'failure_explanation')::varchar as failure_explanation,
        (NEW.json_blob->>'comparison_expected')::varchar as comparison_expected,
        (NEW.json_blob->>'comparison_observed')::varchar as comparison_observed,
        (NEW.json_blob->>'analyzer_result_type')::varchar as analyzer_result_type,
        (NEW.json_blob->>'image_path')::text as image_path,
        (NEW.json_blob->>'reference_profile_id')::text as reference_profile_id,
        lower(NEW.json_blob->>'frequent_string_comparison_operator')::frequent_string_comparison_operator_enum as frequent_string_comparison_operator,
        (NEW.json_blob->>'anomaly_count')::integer as anomaly_count
    ),

    -- Insert anomaly if its an anomaly
    step2 as (insert into whylabs.analysis_anomalies (org_id, dataset_id, column_name, id, run_id, analysis_id, dataset_timestamp, creation_timestamp, monitor_ids, seasonal_lambda_keep, seasonal_adjusted_prediction, seasonal_replacement, drift_metric_value, diff_metric_value, drift_threshold, diff_threshold, threshold_absolute_upper, threshold_absolute_lower,
                                                 threshold_factor, threshold_baseline_metric_value, threshold_metric_value, threshold_calculated_upper, threshold_calculated_lower, segment_weight, anomaly_count, calculation_runtime_nano, analyzer_version, baseline_count, baseline_batches_with_profile_count, target_count,
                                                 target_batches_with_profile_count, expected_baseline_count, expected_baseline_suppression_threshold, analyzer_config_version,
                                                 entity_schema_version, weight_config_version, column_list_added, column_list_removed, threshold_min_batch_size, monitor_config_version,
                                                 granularity, target_level, diff_mode, column_list_mode, threshold_type,
                                                 seasonal_should_replace, user_initiated_backfill, is_rollup, user_marked_unhelpful,
                                                 segment, analyzer_id, algorithm, analyzer_type, metric, algorithm_mode,
                                                 column_list_added_sample, column_list_removed_sample, frequent_string_comparison_sample,
                                                 failure_type, failure_explanation, comparison_expected, comparison_observed, analyzer_result_type,
                                                 image_path, reference_profile_id)
    select org_id, dataset_id, column_name, id, run_id, analysis_id, dataset_timestamp, creation_timestamp, monitor_ids, seasonal_lambda_keep, seasonal_adjusted_prediction, seasonal_replacement, drift_metric_value, diff_metric_value, drift_threshold, diff_threshold, threshold_absolute_upper, threshold_absolute_lower,
           threshold_factor, threshold_baseline_metric_value, threshold_metric_value, threshold_calculated_upper, threshold_calculated_lower, segment_weight, anomaly_count, calculation_runtime_nano, analyzer_version, baseline_count, baseline_batches_with_profile_count, target_count,
           target_batches_with_profile_count, expected_baseline_count, expected_baseline_suppression_threshold, analyzer_config_version,
           entity_schema_version, weight_config_version, column_list_added, column_list_removed, threshold_min_batch_size, monitor_config_version,
           granularity, target_level, diff_mode, column_list_mode, threshold_type,
           seasonal_should_replace, user_initiated_backfill, is_rollup, user_marked_unhelpful,
           segment, analyzer_id, algorithm, analyzer_type, metric, algorithm_mode,
           column_list_added_sample, column_list_removed_sample, frequent_string_comparison_sample,
           failure_type, failure_explanation, comparison_expected, comparison_observed, analyzer_result_type,
           image_path, reference_profile_id
    from r where anomaly_count > 0 RETURNING id)

    -- Insert non_anomaly if its not an anomaly
    insert into whylabs.analysis_non_anomalies (org_id, dataset_id, column_name, id, run_id, analysis_id, dataset_timestamp, creation_timestamp, monitor_ids, seasonal_lambda_keep, seasonal_adjusted_prediction, seasonal_replacement, drift_metric_value, diff_metric_value, drift_threshold, diff_threshold, threshold_absolute_upper, threshold_absolute_lower,
                                                 threshold_factor, threshold_baseline_metric_value, threshold_metric_value, threshold_calculated_upper, threshold_calculated_lower, segment_weight, anomaly_count, calculation_runtime_nano, analyzer_version, baseline_count, baseline_batches_with_profile_count, target_count,
                                                 target_batches_with_profile_count, expected_baseline_count, expected_baseline_suppression_threshold, analyzer_config_version,
                                                 entity_schema_version, weight_config_version, column_list_added, column_list_removed, threshold_min_batch_size, monitor_config_version,
                                                 granularity, target_level, diff_mode, column_list_mode, threshold_type,
                                                 seasonal_should_replace, user_initiated_backfill, is_rollup, user_marked_unhelpful,
                                                 segment, analyzer_id, algorithm, analyzer_type, metric, algorithm_mode,
                                                 column_list_added_sample, column_list_removed_sample, frequent_string_comparison_sample,
                                                 failure_type, failure_explanation, comparison_expected, comparison_observed, analyzer_result_type,
                                                 image_path, reference_profile_id)
    select org_id, dataset_id, column_name, id, run_id, analysis_id, dataset_timestamp, creation_timestamp, monitor_ids, seasonal_lambda_keep, seasonal_adjusted_prediction, seasonal_replacement, drift_metric_value, diff_metric_value, drift_threshold, diff_threshold, threshold_absolute_upper, threshold_absolute_lower,
           threshold_factor, threshold_baseline_metric_value, threshold_metric_value, threshold_calculated_upper, threshold_calculated_lower, segment_weight, anomaly_count, calculation_runtime_nano, analyzer_version, baseline_count, baseline_batches_with_profile_count, target_count,
           target_batches_with_profile_count, expected_baseline_count, expected_baseline_suppression_threshold, analyzer_config_version,
           entity_schema_version, weight_config_version, column_list_added, column_list_removed, threshold_min_batch_size, monitor_config_version,
           granularity, target_level, diff_mode, column_list_mode, threshold_type,
           seasonal_should_replace, user_initiated_backfill, is_rollup, user_marked_unhelpful,
           segment, analyzer_id, algorithm, analyzer_type, metric, algorithm_mode,
           column_list_added_sample, column_list_removed_sample, frequent_string_comparison_sample,
           failure_type, failure_explanation, comparison_expected, comparison_observed, analyzer_result_type,
           image_path, reference_profile_id
    from r where anomaly_count = 0;

    -- Returning null here means we don't actually pay for the json write to the bulk_proxy_analysis table
    RETURN null;
END $$;

-- Example copy command from a dump out of SnapshotDeltalake or EventsJob
--COPY whylabs.bulk_proxy_analysis (json_blob) FROM PROGRAM 'cat /s3/delta/chris/analyzer_results_full_0625/*' ;

-- All fields in the field list DatalakeRowV1ToCsv
CREATE table IF NOT EXISTS whylabs.bulk_proxy_analysis (json_blob jsonb);

-- Funnel writes to a function that casts the json and inserts data into the correct table
CREATE or replace TRIGGER bulk_proxy_analysis_trigger
    BEFORE INSERT ON whylabs.bulk_proxy_analysis
    FOR EACH ROW EXECUTE PROCEDURE bulk_analysis_proxy_function();
