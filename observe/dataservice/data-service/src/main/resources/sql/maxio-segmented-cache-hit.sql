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

segment_maxio as ( SELECT row_number() OVER () AS id,* FROM whylabs.max_io_cache  CROSS JOIN parameters "p"
                                                                                  WHERE
                                                                                       org_id = p.orgId
                                                                                   AND dataset_id = p.datasetId
                                                                                   AND dataset_timestamp >= p.startTS
                                                                                   AND dataset_timestamp < p.endTS)

select row_number() OVER () AS id,  EXTRACT(EPOCH FROM dataset_timestamp) * 1000 as timestamp, is_output, sum(max_count) as max_count, cast(tags as text) as tags from segment_maxio  join query_segments on query_segments.tags <@ segment_maxio.segment_text group by query_segments.tags, is_output, dataset_timestamp
order by timestamp;
