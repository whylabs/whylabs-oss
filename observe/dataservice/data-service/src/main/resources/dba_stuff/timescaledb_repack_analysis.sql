-- These are a tiny bit too slow to put into liquibase so we'll run them manually
SELECT reorder_chunk(i, 'whylabs.anomaly_general2_idx') FROM show_chunks('whylabs.analysis_anomalies') i;
SELECT reorder_chunk(i, 'whylabs.non_anomaly_general2_idx') FROM show_chunks('whylabs.analysis_non_anomalies') i;

-- Analyze chunk size by time (EG should we apply data retention?)
with older_chunks as (SELECT show_chunks('whylabs.profiles_overall_hypertable',older_than => DATE '2023-04-30') as c),
     order_chunk_names as (select split_part(c::text, '.', 2) as e from older_chunks)
SELECT sum(total_bytes) FROM chunks_detailed_size('whylabs.profiles_overall_hypertable') join order_chunk_names on chunk_name = order_chunk_names.e;
-- 320106864640  320GB

with     newer_chunks as (SELECT show_chunks('whylabs.profiles_overall_hypertable',newer_than => DATE '2023-04-30') as d),
         newer_chunk_names as (select split_part(d::text, '.', 2) as f from newer_chunks)
SELECT sum(total_bytes) FROM chunks_detailed_size('whylabs.profiles_overall_hypertable') join newer_chunk_names on chunk_name = newer_chunk_names.f;
-- 3421136470016 3.4TB


with     newer_chunks as (SELECT show_chunks('whylabs.profiles_overall_hypertable',newer_than => DATE '2023-04-30') as d),
         newer_chunk_names as (select split_part(d::text, '.', 2) as f from newer_chunks)
SELECT total_bytes, chunk_name FROM chunks_detailed_size('whylabs.profiles_overall_hypertable') as details join newer_chunk_names on chunk_name = newer_chunk_names.f order by details.total_bytes desc;



SELECT * FROM timescaledb_information.chunks WHERE chunk_name = '_hyper_2_48402_chunk';
--4/18 --4/25 --4/11 --1/11  10-26

-- 97GB/week


with     newer_chunks as (SELECT show_chunks('whylabs.profiles_segmented_hypertable',newer_than => DATE '2023-04-30') as d),
         newer_chunk_names as (select split_part(d::text, '.', 2) as f from newer_chunks)
SELECT total_bytes, chunk_name FROM chunks_detailed_size('whylabs.profiles_segmented_hypertable') as details join newer_chunk_names on chunk_name = newer_chunk_names.f order by details.total_bytes desc;

-- 83GB/week


select count(distinct (segment_text[0])) from whylabs.legacy_segments where org_id = 'org-L46LM4' and dataset_id = 'model-8';