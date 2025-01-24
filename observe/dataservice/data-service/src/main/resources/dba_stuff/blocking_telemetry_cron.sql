-- Create a table (only need to do this once)
create table whylabs.blocking_telemetry as SELECT COALESCE(blockingl.relation::regclass::text, blockingl.locktype) AS locked_item,
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

-- Schedule to gather telemetry on blocked queries with pg_cron
SELECT cron.schedule('blocking-query-telemetry', '*/5 * * * *', $$insert into whylabs.blocking_telemetry (locked_item, waiting_duration, blocked_pid, blocked_query, blocked_mode, blocking_pid, blocking_query, blocking_mode, ts) select *
from (SELECT COALESCE(blockingl.relation::regclass::text, blockingl.locktype) AS locked_item,
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
      WHERE NOT blockedl.granted AND blockinga.datname = current_database()) as c;
$$);

update cron.job set nodename = '' where jobname = 'blocking-query-telemetry';
update cron.job set username = 'postgres' where jobname = 'blocking-query-telemetry';

-- Uschedule once we're done with it
SELECT cron.unschedule ('blocking-query-telemetry');

-- Check if its running
select * from cron.job_run_details order by runid desc limit 5;
select * from cron.job;

-- Alas, see recent blocked queries
select * from whylabs.blocking_telemetry order by ts desc limit 10;
