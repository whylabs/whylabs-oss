-- estimate row count for staging tables.

WITH RECURSIVE pg_inherit(inhrelid, inhparent) AS
                   (select inhrelid, inhparent
                    FROM pg_inherits
                    WHERE cast(cast(inhparent as regclass) as text) like 'whylabs%staging'
                    UNION
                    SELECT child.inhrelid, parent.inhparent
                    FROM pg_inherit child, pg_inherits parent
                    WHERE child.inhparent = parent.inhrelid
                   ),

               pg_inherit_short AS (
                   SELECT *
                   FROM pg_inherit
                   WHERE inhparent NOT IN (SELECT inhrelid FROM pg_inherit)
               )

SELECT cast(cast(parent as regclass) as text), row_estimate, total_bytes
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
                                    RIGHT JOIN pg_inherit_short ON inhrelid = oid
                           WHERE relkind IN ('r', 'p')
                       ) c
                  GROUP BY parent, reltablespace
              ) a
     ) b LEFT JOIN pg_tablespace ON (pg_tablespace.oid = reltablespace)
ORDER BY total_bytes DESC;