with primary_segment as (
    select
        PLACEHOLDER_MERGE_OPERATION,
        TRIM('"' FROM PLACEHOLDER_EXPAND_COLUMN_SEGMENT ::text)     as columnSegment,
        segment_text
    from
        PLACEHOLDER_PROFILES_TABLE
    WHERE
            org_id = :orgId
      AND dataset_id = :resourceId
      AND ((:columnName is null and column_name is null) OR :columnName = column_name)
      AND metric_path = :metricPath
      AND dataset_timestamp >= CAST(:startTimestamp as TIMESTAMP) at time zone 'UTC'
      AND dataset_timestamp < CAST(:endTimestamp as TIMESTAMP) at time zone 'UTC'
    GROUP BY
        segment_text
),
 exploded as (
     SELECT
         columnSegment,
         PLACEHOLDER_EXPLODED_MERGE_OPERATION as agg_data,
         TRIM('"' FROM PLACEHOLDER_EXPAND_ROW_SEGMENT ::text)   as rowSegment
     FROM primary_segment
     WHERE
         :columnSegmentsFilter is null
         OR columnSegment in :columnSegmentsFilter
     group by rowSegment, columnSegment
 )
-- produce common result row format, compatible with profile timeseries metrics
select
    columnSegment as group_id,
    rowSegment as segment,
    PLACEHOLDER_POSTAGG_OPERATION as value
from
    exploded
    PLACEHOLDER_SEGMENT_KEY_ROW_FILTER