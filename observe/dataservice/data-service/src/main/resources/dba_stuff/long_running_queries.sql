-- List long running queries

SELECT pid, age(clock_timestamp(), query_start), usename, query, state
FROM pg_stat_activity
WHERE state != 'idle' AND query NOT ILIKE '%pg_stat_activity%'
ORDER BY query_start desc;

SELECT objid, mode, granted FROM pg_locks WHERE locktype = 'advisory';

-- Kill a specific one
SELECT pg_cancel_backend('2698233');
SELECT pg_cancel_backend('740835');

-- Kill all delete requests
SELECT pg_cancel_backend(pid) FROM pg_stat_activity WHERE  usename = 'dataservice' and pid <> pg_backend_pid() and query like 'DELETE%';

-- Kill all copy commands
SELECT pg_cancel_backend(pid) FROM pg_stat_activity WHERE state = 'active' and pid <> pg_backend_pid() and usename = 'dataservice' and query like '%COPY%';

-- Kill all data promotion queries
SELECT pg_cancel_backend(pid) FROM pg_stat_activity WHERE state = 'active' and pid <> pg_backend_pid() and usename = 'dataservice' and query like '%Query to merge%';

-- Check blocking telemetry table
select * from whylabs.blocking_telemetry order by ts desc limit 10;

-- What queries are blocking what queries right now?

SELECT COALESCE(blockingl.relation::regclass::text, blockingl.locktype) AS locked_item,
       now() - blockeda.query_start                                     AS waiting_duration,
       blockeda.pid                                                     AS blocked_pid,
       blockeda.query                                                   AS blocked_query,
       blockedl.mode                                                    AS blocked_mode,
       blockinga.pid                                                    AS blocking_pid,
       blockinga.query                                                  AS blocking_query,
       blockingl.mode                                                   AS blocking_mode,
       now() as ts
FROM pg_locks blockedl
         JOIN pg_stat_activity blockeda ON blockedl.pid = blockeda.pid
         JOIN pg_locks blockingl ON (blockingl.transactionid = blockedl.transactionid OR
                                     blockingl.relation = blockedl.relation AND
                                     blockingl.locktype = blockedl.locktype) AND blockedl.pid <> blockingl.pid
         JOIN pg_stat_activity blockinga ON blockingl.pid = blockinga.pid AND blockinga.datid = blockeda.datid
WHERE NOT blockedl.granted AND blockinga.datname = current_database();
