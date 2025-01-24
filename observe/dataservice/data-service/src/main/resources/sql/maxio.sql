-- noinspection SqlNoDataSourceInspectionForFile
WITH aggregate_sum AS (
         SELECT
                 extract(epoch from date_trunc(:granularity, dataset_timestamp AT TIME ZONE 'UTC'))*1000 AS "timestamp",
                 column_name,
                 column_name = ANY (CAST(:outputColumns as text[])) "is_output",
                 sum(n_sum) "n_sum"
         FROM
             whylabs.profiles_overall
         WHERE
                 org_id = :orgId
           AND dataset_id = :datasetId
           AND dataset_timestamp >= CAST(:startTS as TIMESTAMP)  at time zone 'UTC'
           AND dataset_timestamp < CAST(:endTS as TIMESTAMP)  at time zone 'UTC'
           AND metric_path = 'counts/n'
         GROUP BY 1, 2, 3),

     max_metrics AS (
         SELECT
             timestamp,
             is_output,
             max(n_sum) "max_count"
         FROM
             aggregate_sum
         group by 1, 2
     )

SELECT row_number() OVER () AS id,* FROM max_metrics
order by timestamp