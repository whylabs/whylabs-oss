alter table whylabs.pg_monitor_schedule add num_schedule_advances integer default 0;
alter table whylabs.global_system add monitor_worker_concurrency integer default 10;