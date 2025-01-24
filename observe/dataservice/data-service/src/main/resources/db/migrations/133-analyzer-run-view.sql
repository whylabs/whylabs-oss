
-- Create a view that mimics the old analyzer runs table so we can swap it out transparently

create or replace view whylabs.async_analyzer_requests_emulate_runs_table as
select
    row_number() over () as id,
    org_id,
    dataset_id,
    created_timestamp as created_ts,
    created_timestamp as started_ts,
    updated_timestamp as completed_ts,
    CASE
        WHEN (status = 'PENDING') then 'REQUESTED'::monitor_run_status_enum
        WHEN (status = 'PLANNING') then 'REQUESTED'::monitor_run_status_enum
        WHEN (status = 'EXECUTING') then 'REQUESTED'::monitor_run_status_enum
        WHEN (status = 'WRITING_RESULTS') then 'REQUESTED'::monitor_run_status_enum
        WHEN (status = 'SUCCESSFUL') then 'COMPLETED'::monitor_run_status_enum
        WHEN (status = 'FAILED') then 'FAILED'::monitor_run_status_enum
        WHEN (status = 'CANCELED') then 'FAILED'::monitor_run_status_enum
        END as status,
    run_id,
    failure_message as internal_error_message,
    analyzer_id,
    null as baseline_batches_with_profile_count, -- not used, sunset
    null as target_batches_with_profile_count, -- not used, sunset
    array_length(columns, 1) as columns_analyzed,
    anomalies,
    string_to_array(failure_type::text, ',') as failure_types,
    true as force_latest_config_version,
    string_to_array(monitor_id::text, ',') as monitor_ids,
    segments as segments_analyzed,
    false as customer_requested_backfill,
    null as analyzer_version -- not used, sunset
from whylabs.adhoc_async_requests
where status = any('{SUCCESSFUL, FAILED}') and created_timestamp >  NOW() - INTERVAL '60 DAY'
;
