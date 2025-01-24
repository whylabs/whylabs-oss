create temp table copy_segmented_profiles on commit drop as select * from whylabs.profiles_segmented where org_id = :sourceOrgId and dataset_id = :sourceDatasetId and dataset_timestamp >= :start and dataset_timestamp < :end ;
update copy_segmented_profiles set org_id = :targetOrgId, dataset_id = :targetDatasetId, id = nextval('whylabs.profiles_segmented_staging_id_seq');
insert into whylabs.profiles_segmented_hypertable select * from copy_segmented_profiles ;

create temp table copy_overall_profiles on commit drop as select * from whylabs.profiles_overall where org_id = :sourceOrgId and dataset_id = :sourceDatasetId and dataset_timestamp >= :start and dataset_timestamp < :end ;
update copy_overall_profiles set org_id = :targetOrgId, dataset_id = :targetDatasetId, id = nextval('whylabs.profiles_segmented_staging_id_seq');
insert into whylabs.profiles_overall_hypertable select * from copy_overall_profiles ;

create temp table copy_segmented_profiles_staging on commit drop as select * from whylabs.profiles_segmented_staging where org_id = :sourceOrgId and dataset_id = :sourceDatasetId and dataset_timestamp >= :start and dataset_timestamp < :end ;
update copy_segmented_profiles_staging set org_id = :targetOrgId, dataset_id = :targetDatasetId, id = nextval('whylabs.profiles_segmented_staging_id_seq');
insert into whylabs.profiles_segmented_hypertable select * from copy_segmented_profiles_staging ;

create temp table copy_overall_profiles_staging on commit drop as select * from whylabs.profiles_overall_staging where org_id = :sourceOrgId and dataset_id = :sourceDatasetId and dataset_timestamp >= :start and dataset_timestamp < :end ;
update copy_overall_profiles_staging set org_id = :targetOrgId, dataset_id = :targetDatasetId, id = nextval('whylabs.profiles_segmented_staging_id_seq');
insert into whylabs.profiles_overall_hypertable select * from copy_overall_profiles_staging ;

create temp table copy_audit_table on commit drop as select * from whylabs.profile_upload_audit where org_id = :sourceOrgId and dataset_id = :sourceDatasetId and dataset_timestamp >= :start and dataset_timestamp < :end ;
update copy_audit_table set org_id = :targetOrgId, dataset_id = :targetDatasetId, s3_path = s3_path||'_copied', id = nextval('whylabs.profile_upload_audit_id_seq');
insert into whylabs.profile_upload_audit select * from copy_audit_table ON CONFLICT (s3_path) DO NOTHING;