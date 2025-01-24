create index if not exists max_io_segmented_v3_idx
    on whylabs.profiles_segmented_hypertable (org_id, dataset_id, dataset_timestamp, column_name)
    INCLUDE (n_sum, segment_text)
    --WITH (timescaledb.transaction_per_chunk) -- Liquibase doesn't like this, but its been ran manually in dev/prod
    WHERE metric_path='counts/n' ;

create index if not exists max_io_segmented_staging_v3_idx
    on whylabs.profiles_segmented_staging (org_id, dataset_id, dataset_timestamp, column_name)
    INCLUDE (n_sum, segment_text)
    --WITH (timescaledb.transaction_per_chunk) -- Liquibase doesn't like this, but its been ran manually in dev/prod
    WHERE metric_path='counts/n' ;

drop index if exists whylabs.max_io_segmented_v2_idx;
drop index if exists  max_io_segmented_staging_v2_idx;


