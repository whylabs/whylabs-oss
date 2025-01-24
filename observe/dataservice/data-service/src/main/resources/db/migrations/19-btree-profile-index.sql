create index profile_btree_rollup_idx
    on whylabs.whylogs_profiles_v1 (org_id, dataset_id, column_name, dataset_timestamp);
