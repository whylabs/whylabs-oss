

create index if not exists max_io_segmented_v2_idx
    on whylabs.profiles_segmented_hypertable (org_id, dataset_id, column_name, dataset_timestamp)
    INCLUDE (n_sum)  WHERE metric_path='counts/n' ;


create index if not exists max_io_segmented_staging_v2_idx
    on whylabs.profiles_segmented_staging (org_id, dataset_id, column_name, dataset_timestamp)
    INCLUDE (n_sum)  WHERE metric_path='counts/n' ;

drop index if exists whylabs.max_io_segmented_staging_idx;
drop index if exists whylabs.max_io_segmented_idx;