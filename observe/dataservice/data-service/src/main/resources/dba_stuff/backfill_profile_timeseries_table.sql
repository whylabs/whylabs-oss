-- Backfill profile_timeseries incrementally, 1 day at a time
-- This script is manual as we don't wanna hang liquibase for a day. Also have the option to break these
-- out into multiple connections so they run in parallel which liquibase can't do.
select f.* from  generate_series('2023-01-01'::date,'2024-01-01'::date,'1 day') s(a), backfillTimeseries(a::date) f;
select f.* from  generate_series('2022-01-01'::date,'2023-01-01'::date,'1 day') s(a), backfillTimeseries(a::date) f;
select f.* from  generate_series('2021-01-01'::date,'2022-01-01'::date,'1 day') s(a), backfillTimeseries(a::date) f;
select f.* from  generate_series('2020-01-01'::date,'2021-01-01'::date,'1 day') s(a), backfillTimeseries(a::date) f;
select f.* from  generate_series('2019-01-01'::date,'2020-01-01'::date,'1 day') s(a), backfillTimeseries(a::date) f;
select f.* from  generate_series('2018-01-01'::date,'2019-01-01'::date,'1 day') s(a), backfillTimeseries(a::date) f;
