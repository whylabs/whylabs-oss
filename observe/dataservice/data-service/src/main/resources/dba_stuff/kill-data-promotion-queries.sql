-- List long running queries
SELECT pid, age(clock_timestamp(), query_start), usename, query, state
FROM pg_stat_activity
WHERE state != 'idle' AND query NOT ILIKE '%pg_stat_activity%' and usename = 'dataservice' and query like '-- Query%'
ORDER BY query_start desc;

-- These can help clear deadlocks if need be

-- Kill data promotion queries
SELECT pg_cancel_backend(pid) FROM pg_stat_activity WHERE state = 'active' and pid <> pg_backend_pid() and state != 'idle' AND query NOT ILIKE '%pg_stat_activity%' and usename = 'dataservice' and query like '-- Query%';

-- Kill pre-render queries
SELECT pg_cancel_backend(pid) FROM pg_stat_activity WHERE state = 'active' and pid <> pg_backend_pid() and state != 'idle' AND query NOT ILIKE '%pg_stat_activity%' and usename = 'dataservice' and query like '-- You might%';

SELECT pid, age(clock_timestamp(), query_start), usename, query, state
FROM pg_stat_activity
ORDER BY query_start desc;

