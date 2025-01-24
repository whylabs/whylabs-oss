
-- Database bloat is disk space that has been used by a table or index and is available for reuse by the database, but has not been freed up. Bloating occurs when tables or indexes are updated. If you have a loaded database with a lot of deletion operations, bloating can leave a lot of unused space in your database and affect performance if it is not removed. The metrics of wastedbytes for tables and wastedibytes for indexes will show you if you have any serious bloat issues. To combat with bloat there is a VACUUM command.
-- TLDR; check if a vacume/pg_repack/or timescaledb repack is needed
SELECT
    current_database(), schemaname, tablename, /*reltuples::bigint, relpages::bigint, otta,*/
    ROUND((CASE WHEN otta=0 THEN 0.0 ELSE sml.relpages::float/otta END)::numeric,1) AS tbloat,
    CASE WHEN relpages < otta THEN 0 ELSE bs*(sml.relpages-otta)::BIGINT END AS wastedbytes,
    iname, /*ituples::bigint, ipages::bigint, iotta,*/
    ROUND((CASE WHEN iotta=0 OR ipages=0 THEN 0.0 ELSE ipages::float/iotta END)::numeric,1) AS ibloat,
    CASE WHEN ipages < iotta THEN 0 ELSE bs*(ipages-iotta) END AS wastedibytes
FROM (
         SELECT
             schemaname, tablename, cc.reltuples, cc.relpages, bs,
             CEIL((cc.reltuples*((datahdr+ma-
                                  (CASE WHEN datahdr%ma=0 THEN ma ELSE datahdr%ma END))+nullhdr2+4))/(bs-20::float)) AS otta,
             COALESCE(c2.relname,'?') AS iname, COALESCE(c2.reltuples,0) AS ituples, COALESCE(c2.relpages,0) AS ipages,
             COALESCE(CEIL((c2.reltuples*(datahdr-12))/(bs-20::float)),0) AS iotta /* very rough approximation, assumes all cols */
         FROM (
                  SELECT
                      ma,bs,schemaname,tablename,
                      (datawidth+(hdr+ma-(case when hdr%ma=0 THEN ma ELSE hdr%ma END)))::numeric AS datahdr,
                      (maxfracsum*(nullhdr+ma-(case when nullhdr%ma=0 THEN ma ELSE nullhdr%ma END))) AS nullhdr2
                  FROM (
                           SELECT
                               schemaname, tablename, hdr, ma, bs,
                               SUM((1-null_frac)*avg_width) AS datawidth,
                               MAX(null_frac) AS maxfracsum,
                               hdr+(
                                   SELECT 1+count(*)/8
                                   FROM pg_stats s2
                                   WHERE null_frac<>0 AND s2.schemaname = s.schemaname AND s2.tablename = s.tablename
                               ) AS nullhdr
                           FROM pg_stats s, (
                               SELECT
                                   (SELECT current_setting('block_size')::numeric) AS bs,
                                   CASE WHEN substring(v,12,3) IN ('8.0','8.1','8.2') THEN 27 ELSE 23 END AS hdr,
                                   CASE WHEN v ~ 'mingw32' THEN 8 ELSE 4 END AS ma
                               FROM (SELECT version() AS v) AS foo
                           ) AS constants
                           GROUP BY 1,2,3,4,5
                       ) AS foo
              ) AS rs
                  JOIN pg_class cc ON cc.relname = rs.tablename
                  JOIN pg_namespace nn ON cc.relnamespace = nn.oid AND nn.nspname = rs.schemaname AND nn.nspname <> 'information_schema'
                  LEFT JOIN pg_index i ON indrelid = cc.oid
                  LEFT JOIN pg_class c2 ON c2.oid = i.indexrelid
     ) AS sml
ORDER BY wastedbytes DESC;