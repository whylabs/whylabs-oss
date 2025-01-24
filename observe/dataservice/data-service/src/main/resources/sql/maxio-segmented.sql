-- You might notice there's no segment filters. Wouldn't it be faster to filter tuples by a single segment?
-- Actually no, on a dataset with lots of columns and lots of segments there's 10s of millions
-- of tuples. Applying the segment match filters against every single tuple ends up being what eats up
-- your query time. You fare better aggregating ALL segments and then filtering out the ones you don't
-- care about in a subsequent step so you're only doing segment filters against a few hundred rows.

-- noinspection SqlNoDataSourceInspectionForFile
--explain

WITH parameters (
                 orgId,
                 datasetId,
                 outputColumns,
                 startTS,
                 endTS,
                 granularity
    ) AS (
    --VALUES ('org-0', 'model-0', CAST('{"output_prediction"}' AS text []), CAST('2022-11-13T00:00:00.000Z' AS TIMESTAMP), CAST('2022-12-14T00:00:00.000Z' AS TIMESTAMP), 'day')
    values (:orgId,  :datasetId,
               -- names of output columns; all others are input
            CAST(:outputColumns as text[]),
               -- Start time. Inclusive
            CAST(:startTS as TIMESTAMP)  at time zone 'UTC',
               -- End time. Exclusive
            CAST(:endTS as TIMESTAMP)  at time zone 'UTC',
               -- Granularity
            :granularity
           )
),
     query_segments as (select jsonb_array_elements(:querySegments) as tags),
    --query_segments as (select jsonb_array_elements('[["purpose=car"],["purpose=major_purchase","verification_status=Verified"]]') as tags),

    unioned as (
        select * from whylabs.profiles_segmented_staging where
                -- This should be redundant, but it helps the query planner make good life decisions
                dataset_timestamp >= CAST(:startTS as TIMESTAMP)  at time zone 'UTC' and
                dataset_timestamp < CAST(:endTS as TIMESTAMP)  at time zone 'UTC' and
                org_id = :orgId AND
                dataset_id = :datasetId AND
                metric_path = 'counts/n'
        union all
        select * from whylabs.profiles_segmented_hypertable where
                -- This should be redundant, but it helps the query planner make good life decisions
                dataset_timestamp >= CAST(:startTS as TIMESTAMP)  at time zone 'UTC' and
                dataset_timestamp < CAST(:endTS as TIMESTAMP)  at time zone 'UTC' and
                org_id = :orgId AND
                dataset_id = :datasetId AND
                metric_path = 'counts/n'
    ),

     aggregate_sum AS (
         SELECT
                 extract(epoch from date_trunc(granularity, dataset_timestamp AT TIME ZONE 'UTC'))*1000 AS "timestamp",
                 column_name,
                 column_name = ANY (p.outputColumns) "is_output",
                 sum(n_sum) "n_sum",
                 segment_text
         FROM
             unioned  CROSS JOIN parameters "p"
         WHERE
                 org_id = p.orgId
           AND dataset_id = p.datasetId
           AND dataset_timestamp >= p.startTS
           AND dataset_timestamp < p.endTS
           AND metric_path = 'counts/n'
         GROUP BY 1, 2, 3, 5

     ),

     max_metrics AS (
         SELECT
             timestamp,
             is_output,
             max(n_sum) "max_count",
             segment_text
         FROM
             aggregate_sum
         group by 1, 2, 4
     ),

     segment_maxio as ( SELECT row_number() OVER () AS id,* FROM max_metrics )

select row_number() OVER () AS id, timestamp, is_output, sum(max_count) as max_count, cast(tags as text) from segment_maxio  join query_segments on query_segments.tags <@ segment_maxio.segment_text group by query_segments.tags, is_output, timestamp
--select  * from segment_maxio
--select   is_output, timestamp from segment_maxio
order by timestamp;

