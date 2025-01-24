-- If enabled a demo dataset will get re-uploaded over and over like a bad techno song (so there's always fresh data)
alter table whylabs.datasets add column if not exists loop_data_enabled bool;
alter table whylabs.datasets add column if not exists loop_data_timestamp timestamptz;
alter table whylabs.datasets add column if not exists loop_data_lookback_buckets int;

