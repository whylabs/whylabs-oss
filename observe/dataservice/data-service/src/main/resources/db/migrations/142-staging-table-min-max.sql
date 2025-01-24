create index if not exists overall_staging_min
    on whylabs.profiles_overall_staging using btree (org_id, dataset_id, dataset_timestamp asc);

create index if not exists segmented_staging_min
    on whylabs.profiles_segmented_staging using btree (org_id, dataset_id, dataset_timestamp asc);

