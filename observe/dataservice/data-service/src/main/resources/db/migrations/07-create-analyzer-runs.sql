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
