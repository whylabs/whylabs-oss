with primary_segment as (
    select
        PLACEHOLDER_MERGE_OPERATION                          as agg_data,
        TRIM('"' FROM PLACEHOLDER_EXPAND_ROW_SEGMENT ::text)     as segment
    from
        whylabs.reference_profiles
    WHERE
            org_id = :orgId
      AND dataset_id = :resourceId
      AND reference_profile_id = :referenceProfile
      AND ((:columnName is null and column_name is null) OR :columnName = column_name)
      AND metric_path = :metricPath
    GROUP BY
        segment
)
select
    :referenceProfile as group_id,
    segment,
    PLACEHOLDER_POSTAGG_OPERATION as value
from
    primary_segment
        PLACEHOLDER_SEGMENT_KEY_ROW_FILTER