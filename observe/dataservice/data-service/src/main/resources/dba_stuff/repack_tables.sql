
-- Generate scripts to reorder chunks and reclaim disk space from deleted tuples. These run one chunk at a time
-- intentionally for 2 reasons.
--
-- 1) Smaller transactions are better especially since PG crashes so often
-- 2) Repacking the whole table at once vs one chunk at a time minimizes the storage space spike

select 'select reorder_chunk(''' ||  chunk || ''', ''whylabs.anomaly_general2_idx'') ;' from show_chunks('whylabs.analysis_anomalies') as chunk;
select 'select reorder_chunk(''' ||  chunk || ''', ''whylabs.non_anomaly_general2_idx'') ;' from show_chunks('whylabs.analysis_non_anomalies') as chunk;

-- before total 3698 GB
select 'select reorder_chunk(''' ||  chunk || ''', ''whylabs.profiles_detailed_overall_hypertable_idx'') ;' from show_chunks('whylabs.profiles_overall_hypertable') as chunk;

-- Segmented table is snowflake b/c you can't reorder_chunk on gin indexes or partial b-tree indexes. Gotta ssh into PG primary to run this on the cli
select 'pg_repack -d whylogs  --table=whylabs.' ||  chunk || ' --order-by=org_id,dataset_id,column_name,dataset_timestamp' from show_chunks('whylabs.profiles_segmented_hypertable') as chunk;
