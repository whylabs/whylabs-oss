-- Identify stuck requests
select * from whylabs.adhoc_async_requests where status = 'EXECUTING' and  updated_timestamp + interval '12 hours' < now();

-- Reset them so they can run again
update whylabs.adhoc_async_requests set status = 'PENDING' where status = 'EXECUTING' and updated_timestamp + interval '12 hours' < now();

-- Give up and reap them
delete from whylabs.adhoc_async_requests where status = 'EXECUTING' and  updated_timestamp + interval '12 hours' < now();
