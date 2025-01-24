-- Experimenting on indexes to see if we can speed up data promotion. NO-OP

drop table whylabs.drew_profiles_segmented_staging;

create table whylabs.drew_profiles_segmented_staging as select * from whylabs.profiles_segmented_staging limit 1000000;

select count(*) as c, org_id, dataset_id from whylabs.drew_profiles_segmented_staging group by org_id, dataset_id order by c desc;

truncate whylabs.drew_profiles_segmented_staging;

explain analyze select min(dataset_timestamp), max(dataset_timestamp) from whylabs.drew_profiles_segmented_staging where org_id = 'org-xbZDrG' and dataset_id = 'model-5';

create index drew_profiles_segmented_staging_min
    on whylabs.drew_profiles_segmented_staging using btree (org_id, dataset_id, dataset_timestamp asc);

drop index whylabs.drew_profiles_segmented_staging_min;

create index drew_profiles_segmented_staging_min
    on whylabs.drew_profiles_segmented_staging using btree (org_id, dataset_id);

SELECT create_hypertable('whylabs.drew_profiles_segmented_staging','last_upload_ts', chunk_time_interval => interval '7 day', create_default_indexes => FALSE, migrate_data=> TRUE);

explain analyze select min(dataset_timestamp) from whylabs.drew_profiles_segmented_staging where org_id = 'org-xbZDrG' and dataset_id = 'model-5';
explain analyze select min(dataset_timestamp), max(dataset_timestamp) from whylabs.drew_profiles_segmented_staging where org_id = 'org-xbZDrG' and dataset_id = 'model-5' and last_upload_ts > '2024-01-01';


