-- noinspection SqlNoDataSourceInspectionForFile

WITH merged_metrics as (select date_trunc(:granularity, dataset_timestamp AT TIME ZONE 'UTC') as timestamp,
              (select a.tag
               from jsonb_array_elements_text(segment_text) as a(tag)
               where a.tag like CONCAT(:segmentKey, '=%'))                     tag,
              -- profile_id is null on all but the unmerged table so we'll typically be grouping by
              -- an empty string (no-op). This allows us to only provide unmerged profile rollups on the
              -- unmerged table, and not having to fork this query for the individual profiles
              coalesce(profile_id, 0)                                    as profile_id,
              max(last_upload_ts)                                        as last_upload_ts,
              column_name,
              metric_path,
              -- merging the metrics here
              classification_merge(classification_profile) as classification_profile,
              coalesce(array_agg(DISTINCT trace_id ORDER BY trace_id) FILTER (WHERE trace_id is not null), cast(array[] as text[]))   as trace_ids
       from whylabs.profiles_overall where
               dataset_timestamp >= CAST(:startTS as TIMESTAMP)  at time zone 'UTC'
           AND dataset_timestamp < CAST(:endTS as TIMESTAMP)  at time zone 'UTC'
           AND org_id = :orgId
           AND dataset_id = :datasetId
           AND column_name is null
--                            AND (:traceId is NULL OR trace_id = :traceId)
--                            AND (:profileId is NULL OR profile_id = :profileId)
           AND (
                                   -- if tags are not specified, we match with all the segment entries (overall segment)
                                       (CAST(:segment_tags as text[]) = CAST('{}' as text[]))
                                       OR
                                       -- if tags are specified, we match with a segment. This is legacy logic atm
                                       -- https://stackoverflow.com/questions/66600968/usage-of-in-native-sql-query-on-jsonb
                                       -- The backslashes escape hibernate parameter detection, and the two question-marks are the JDBC escape.
                                       (segment_text \?\?& CAST(:segment_tags as text[])))
           AND metric_path = 'model/classification'
       group by timestamp, tag, column_name, metric_path, profile_id)


select row_number() OVER () AS id, extract(epoch from timestamp) * 1000 as timestamp, tag, last_upload_ts, classification_profile as metrics
from merged_metrics
order by timestamp
