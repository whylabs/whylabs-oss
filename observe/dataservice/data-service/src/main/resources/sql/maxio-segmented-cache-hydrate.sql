-- You might notice there's no segment filters. Wouldn't it be faster to filter tuples by a single segment?
-- Actually no, on a dataset with lots of columns and lots of segments there's 10s of millions
-- of tuples. Applying the segment match filters against every single tuple ends up being what eats up
-- your query time. You fare better aggregating ALL segments and then filtering out the ones you don't
-- care about in a subsequent step so you're only doing segment filters against a few hundred rows.


WITH
    aggregate_sum AS (
        SELECT
                extract(epoch from date_trunc(?, dataset_timestamp AT TIME ZONE 'UTC'))*1000 AS "timestamp",
                column_name,
                column_name = ANY (CAST(? as text[])) "is_output",
                sum(n_sum) "n_sum",
                segment_text
        FROM
            whylabs.profiles_segmented_hypertable
        WHERE
                org_id = ?
          AND dataset_id = ?
          AND dataset_timestamp >= CAST(? as TIMESTAMP)  at time zone 'UTC'
          AND dataset_timestamp < CAST(? as TIMESTAMP)  at time zone 'UTC'
          AND metric_path = 'counts/n'
        GROUP BY 1, 2, 3, 5
    ),
    data as
        (SELECT timestamp,
                is_output,
                max(n_sum) "max_count",
                segment_text
         FROM aggregate_sum
         group by 1, 2, 4)

insert into whylabs.max_io_cache (org_id, dataset_id, segment_text, dataset_timestamp, is_output, max_count, updated_timestamp)
select ?, ?, data.segment_text, to_timestamp(data.timestamp / 1000) at time zone 'UTC', data.is_output, data.max_count, now() from data
ON CONFLICT (org_id, dataset_id, segment_text, dataset_timestamp, is_output) DO
    UPDATE set
               updated_timestamp = now(),
               max_count = excluded.max_count;