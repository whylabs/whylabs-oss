-- Recreate views

create or replace view whylabs.profiles_all as select * from whylabs.profiles_segmented_staging union all select * from whylabs.profiles_segmented_hypertable union all select * from whylabs.profiles_overall_staging union all select * from whylabs.profiles_overall_hypertable  union all select * from whylabs.profiles_overall_staging_silver  union all select * from whylabs.profiles_segmented_staging_silver;
create or replace view whylabs.profiles_segmented as select * from whylabs.profiles_segmented_staging union all select * from whylabs.profiles_segmented_hypertable union all select * from whylabs.profiles_segmented_staging_silver;
create or replace view whylabs.profiles_overall as select * from whylabs.profiles_overall_staging union all select * from whylabs.profiles_overall_hypertable union all select * from whylabs.profiles_overall_staging_silver;

-- Single record in this table

insert into whylabs.global_system (status) values ('normal');

-- Queue Tables for the different data moving tasks

CREATE TABLE IF NOT EXISTS whylabs.queue_data_promotions_bronze_to_silver (
                                                                              id serial PRIMARY KEY,
                                                                              org_id text NOT NULL,
                                                                              dataset_id text NOT NULL,
                                                                              unique (org_id, dataset_id)
);

CREATE TABLE IF NOT EXISTS whylabs.queue_data_promotions_silver_to_historical (
                                                                                  id serial PRIMARY KEY,
                                                                                  org_id text NOT NULL,
                                                                                  dataset_id text NOT NULL,
                                                                                  unique (org_id, dataset_id)
);

CREATE TABLE IF NOT EXISTS whylabs.queue_timescale_compression (
                                                                   id serial PRIMARY KEY,
                                                                   chunk text NOT NULL,
                                                                   unique (chunk)
);