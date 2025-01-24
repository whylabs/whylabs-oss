-- Test 1)
-- Druid
-- SELECT min(__time) FROM "whylogs-whylabs-rollup" WHERE orgId = 'org-7408' AND columnName = 'user_age' AND datasetId = 'model-18'
-- PG
SELECT min(dataset_timestamp) FROM whylabs.profiles_overall
WHERE org_id = 'org-7408' AND column_name = 'user_age' AND dataset_id = 'model-18' and dataset_timestamp > '2022-10-14T16:00:00.000Z' and dataset_timestamp < '2022-10-20T16:00:00.000Z' ;


-- Test 2)
-- Druid
-- SELECT APPROX_COUNT_DISTINCT(columnName) as cols,  datasetId FROM "whylogs-whylabs-rollup" WHERE orgId = 'org-4471'  AND __time > '2023-04-01' AND __time < '2023-04-10' group by datasetId order by cols desc
-- PG
SELECT count(distinct (column_name)) as cols, dataset_id FROM whylabs.profiles_overall
WHERE org_id = 'org-4471'  and dataset_timestamp > '2023-04-01'::timestamptz and dataset_timestamp < '2023-04-02'::timestamptz group by dataset_id order by cols desc;

-- Test 3) analyzer results
-- Druid
-- SELECT sum(anomalyCount) FROM "whylogs-whylabs-analyzer-results-v3" where  "__time" > '2023-05-14' and  "__time" < '2023-05-16'
-- PG
select sum(anomaly_count) from whylabs.analysis WHERE dataset_timestamp > '2023-05-14'::timestamptz and dataset_timestamp < '2023-05-16'::timestamptz;

-- Test 3) analyzer results, older
-- Druid
-- SELECT sum(anomalyCount) as c, orgId FROM "whylogs-whylabs-analyzer-results-v3" where  "__time" > '2023-05-14' and  "__time" < '2023-06-15' group by orgId order by c desc
-- PG
select count(*) as c , org_id from whylabs.analysis_anomalies WHERE dataset_timestamp > '2023-05-14'::timestamptz and dataset_timestamp < '2023-06-15'::timestamptz group by org_id order by c desc;


-- Test 4) Dupe ingestion of analyzer results
-- Druid
-- SELECT APPROX_COUNT_DISTINCT(id), count(*) FROM "whylogs-whylabs-analyzer-results-v3"
-- ^- Shows ~6% inflated stats in druid
-- PG - Shows no dupes
SELECT count(distinct (id)), count(*) FROM whylabs.analysis;
SELECT count(distinct (id)), count(*) FROM whylabs.analysis_anomalies;

