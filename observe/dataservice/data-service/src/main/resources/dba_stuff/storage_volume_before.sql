SELECT pg_size_pretty(sum(pg_total_relation_size(psu.relid))) AS total
FROM pg_catalog.pg_statio_user_tables psu
         join timescaledb_information.chunks on timescaledb_information.chunks.chunk_name = psu.relname
where (timescaledb_information.chunks.hypertable_name = 'profiles_segmented_hypertable' or
       timescaledb_information.chunks.hypertable_name = 'profiles_overall_hypertable')
  and range_start < '2022-08-09 00:00:00.000000 +00:00'
ORDER BY sum(pg_total_relation_size(psu.relid)) DESC;

-- 616 GB  >1yr old * 3 machines = 1.8TB * $.08/gb/month = $147/month for retaining older data
-- 3854 GB  <1yr old