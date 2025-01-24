WITH RECURSIVE pg_inherit(inhrelid, inhparent) AS
                   (select inhrelid, inhparent
                    FROM pg_inherits
                    UNION
                    SELECT child.inhrelid, parent.inhparent
                    FROM pg_inherit child, pg_inherits parent
                    WHERE child.inhparent = parent.inhrelid),
               pg_inherit_short AS (SELECT * FROM pg_inherit WHERE inhparent NOT IN (SELECT inhrelid FROM pg_inherit))
SELECT parent::regclass
     , coalesce(spcname, 'default') pg_tablespace_name
     , row_estimate
     , pg_size_pretty(total_bytes) AS total
     , pg_size_pretty(index_bytes) AS INDEX
     , pg_size_pretty(toast_bytes) AS toast
     , pg_size_pretty(table_bytes) AS TABLE
     , 100 * total_bytes::float8 / sum(total_bytes) OVER () AS PERCENT
FROM (
         SELECT *, total_bytes-index_bytes-COALESCE(toast_bytes,0) AS table_bytes
         FROM (
                  SELECT parent
                       , reltablespace
                       , SUM(c.reltuples) AS row_estimate
                       , SUM(pg_total_relation_size(c.oid)) AS total_bytes
                       , SUM(pg_indexes_size(c.oid)) AS index_bytes
                       , SUM(pg_total_relation_size(reltoastrelid)) AS toast_bytes
                  FROM (
                           SELECT pg_class.oid
                                , reltuples
                                , relname
                                , relnamespace
                                , reltablespace reltablespace
                                , pg_class.reltoastrelid
                                , COALESCE(inhparent, pg_class.oid) parent
                           FROM pg_class
                                    LEFT JOIN pg_inherit_short ON inhrelid = oid
                           WHERE relkind IN ('r', 'p')
                       ) c
                  GROUP BY parent, reltablespace
              ) a
     ) a LEFT JOIN pg_tablespace ON (pg_tablespace.oid = reltablespace)
ORDER BY total_bytes DESC;