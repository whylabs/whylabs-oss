create temp table copy_ref_profiles on commit drop as select * from whylabs.reference_profiles where org_id = :sourceOrgId and dataset_id = :sourceDatasetId and reference_profile_id = :referenceProfileId ;
update copy_ref_profiles set org_id = :targetOrgId, dataset_id = :targetDatasetId, id = nextval('whylabs.reference_profiles_id_seq') ;
insert into whylabs.reference_profiles  select * from copy_ref_profiles ;
