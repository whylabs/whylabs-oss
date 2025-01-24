-- In theory data's being deleted during promotion, but keeping the chunks tidy improves query planning speed and frees up space
SELECT add_retention_policy('whylabs.profiles_overall_staging_silver', INTERVAL '30 days', if_not_exists => TRUE);


-- In theory data's being deleted during promotion, but keeping the chunks tidy improves query planning speed and frees up space
SELECT add_retention_policy('whylabs.profiles_segmented_staging_silver', INTERVAL '30 days', if_not_exists => TRUE);

-- Have to re-create the view after altering underlying column types which will happen in the next file

drop view if exists profiles_all;
drop view if exists whylabs.profiles_all;
drop view if exists whylabs.profiles_segmented;
drop view if exists whylabs.profiles_overall;

CREATE TABLE IF NOT EXISTS whylabs.global_system(
                                                    status system_status default 'normal',
                                                    last_updated_timestamp timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
                                                    data_availability_cutoff      timestamptz,
                                                    pg_cron_flow_enabled boolean default false
);
