-- Test flow for maxIO segmented

select *
from pg_settings
where name like '%autovacuum%';

ALTER TABLE <TABLE> SET (autovacuum_freeze_min_age = 0);

vacuum  (PARALLEL 8) whylabs.profiles_segmented_hypertable ;

explain analyze WITH parameters (
                 orgId,
                 datasetId,
                 outputColumns,
                 startTS,
                 endTS,
                 granularity
    ) AS (
    VALUES ('org-hURArx', 'model-2', CAST('{"output_prediction","output_target"}' AS text []), CAST('2023-07-01T00:00:00.000Z' AS TIMESTAMP)  at time zone 'UTC', CAST('2023-07-14T00:00:00.000Z' AS TIMESTAMP)  at time zone 'UTC', 'day')

),
     aggregate_sum AS (
         SELECT
                 extract(epoch from date_trunc(granularity, dataset_timestamp AT TIME ZONE 'UTC'))*1000 AS "timestamp",
                 column_name = ANY (p.outputColumns) "is_output",
                 sum(n_sum) "n_sum",
                 segment_text
         FROM
             whylabs.profiles_segmented_hypertable CROSS JOIN parameters "p"
         WHERE
                 org_id = p.orgId
           AND dataset_id = p.datasetId
           AND dataset_timestamp >= p.startTS
           AND dataset_timestamp < p.endTS
           AND metric_path = 'counts/n'
         GROUP BY 1, 2, 4
         union all
         SELECT
                 extract(epoch from date_trunc(granularity, dataset_timestamp AT TIME ZONE 'UTC'))*1000 AS "timestamp",
                 column_name = ANY (p.outputColumns) "is_output",
                 sum(n_sum) "n_sum",
                 segment_text
         FROM
             whylabs.profiles_segmented_staging CROSS JOIN parameters "p"
         WHERE
                 org_id = p.orgId
           AND dataset_id = p.datasetId
           AND dataset_timestamp >= p.startTS
           AND dataset_timestamp < p.endTS
           AND metric_path = 'counts/n'
         GROUP BY 1, 2, 4

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
     )

SELECT row_number() OVER () AS id,* FROM max_metrics
order by timestamp;


create table whylabs.query_tags_drew (tags text[]);
INSERT INTO whylabs.query_tags_drew (tags) VALUES  (ARRAY['gender=female']);
INSERT INTO whylabs.query_tags_drew (tags) VALUES  (ARRAY['gender=female', 'loc=north']);

select * from whylabs.drew_agg;

select row_number() OVER () AS id, timestamp, is_output, sum(max_count) as max_count, tags from drew_agg  join whylabs.query_tags_drew on to_jsonb(whylabs.query_tags_drew.tags) <@ drew_agg.segment_text group by tags, is_output, timestamp;

