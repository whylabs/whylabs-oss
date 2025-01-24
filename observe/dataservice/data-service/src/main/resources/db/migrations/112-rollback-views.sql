create or replace view whylabs.profiles_all as select * from whylabs.profiles_segmented_staging union all select * from whylabs.profiles_segmented_hypertable union all select * from whylabs.profiles_overall_staging union all select * from whylabs.profiles_overall_hypertable;
create or replace view whylabs.profiles_segmented as select * from whylabs.profiles_segmented_staging union all select * from whylabs.profiles_segmented_hypertable;
create or replace view whylabs.profiles_overall as select * from whylabs.profiles_overall_staging union all select * from whylabs.profiles_overall_hypertable;
