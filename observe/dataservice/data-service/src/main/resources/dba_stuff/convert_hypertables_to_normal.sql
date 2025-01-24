-- Convert hypertables into non_hypertables. Why on earth would you do this? The only reason is to make
-- pg_dump work which doesn't handle child tables correctly. This is something we only do for our
-- generating dumps for our unit test process.

CREATE TABLE IF NOT EXISTS whylabs.profiles_overall_staging_tmp
(
    like whylabs.profiles_overall_staging including all
);

insert into whylabs.profiles_overall_staging_tmp select * from whylabs.profiles_overall_staging;
drop table whylabs.profiles_overall_staging cascade ;
ALTER TABLE whylabs.profiles_overall_staging_tmp RENAME TO profiles_overall_staging;

CREATE TABLE IF NOT EXISTS whylabs.profiles_segmented_staging_tmp
(
    like whylabs.profiles_segmented_staging including all
);

insert into whylabs.profiles_segmented_staging_tmp select * from whylabs.profiles_segmented_staging;
drop table whylabs.profiles_segmented_staging cascade ;
ALTER TABLE whylabs.profiles_segmented_staging_tmp RENAME TO profiles_segmented_staging;

CREATE TABLE IF NOT EXISTS whylabs.profiles_segmented_hypertable_tmp
(
    like whylabs.profiles_segmented_hypertable including all
);

insert into whylabs.profiles_segmented_hypertable_tmp select * from whylabs.profiles_segmented_hypertable;
drop table whylabs.profiles_segmented_hypertable cascade ;
ALTER TABLE whylabs.profiles_segmented_hypertable_tmp RENAME TO profiles_segmented_hypertable;


CREATE TABLE IF NOT EXISTS whylabs.profiles_overall_hypertable_tmp
(
    like whylabs.profiles_overall_hypertable including all
);

insert into whylabs.profiles_overall_hypertable_tmp select * from whylabs.profiles_overall_hypertable;
drop table whylabs.profiles_overall_hypertable cascade ;
ALTER TABLE whylabs.profiles_overall_hypertable_tmp RENAME TO profiles_overall_hypertable;


CREATE TABLE IF NOT EXISTS whylabs.profiles_unmerged_hypertable_tmp
(
    like whylabs.profiles_unmerged_hypertable including all
);

insert into whylabs.profiles_unmerged_hypertable_tmp select * from whylabs.profiles_unmerged_hypertable;
drop table whylabs.profiles_unmerged_hypertable cascade ;
ALTER TABLE whylabs.profiles_unmerged_hypertable_tmp RENAME TO profiles_unmerged_hypertable;


