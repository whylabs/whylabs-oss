-- noinspection SqlNoDataSourceInspectionForFile

WITH parameters (orgId, granularity, datasetIds, startTS, endTS, segments, excludeSegments, monitorIds, analyzerIds, runIds, columnNames, includeUnhelpful, granularityInclusion, parentChildScope) as (
--     values ('org-5Hsdjx', 'day', CAST('{"model-32"}' as text[]),
--             CAST('2022-11-20T00:00:00.000Z' as TIMESTAMP), CAST('2023-11-20T00:00:00.000Z' as TIMESTAMP),
--             CAST('{}' as text[]), CAST('{}' as text[]),
--             CAST('{frequent-items-drift-monitor,irrelevant-id-to-show-that-this-is-a-disjunction}' as text[]),
--             CAST('{frequent-items-drift-analyzer}' as text[]),
--             CAST('{}' as text[]),
--             CAST('{"seasonalvalue", "acc_now_delinq","annual_inc", "mo_sin_old_rev_tl_op"}' as text[]))
--
    values (:orgId,
            :granularity,
            CAST(:datasetIds as text[]),
            CAST(:startTS as TIMESTAMP)  at time zone 'UTC',
            CAST(:endTS as TIMESTAMP)  at time zone 'UTC',
            CAST(:segments as text[]),
            CAST(:excludeSegments as text[]),
            CAST(:monitorIds as text[]),
            CAST(:analyzerIds as text[]),
            CAST(:runIds as text[]),
            CAST(:columnNames as text[]),
            CAST(:includeUnhelpful as bool),
            :granularityInclusion,
            :parentChildScope

    )

),

        events as (
    select count(*) as overall,
        sum(d.anomaly_count) as anomalies,
        sum(case when d.failure_type is null then 0 else 1 end) as failures,
        d.dataset_id as datasetId,
        extract(epoch from date_trunc(p.granularity, d.dataset_timestamp AT TIME ZONE 'UTC'))*1000 as timestamp
    -- It's tempting to hit the analysis_anomalies, but then you'll miss out on non-anomalies aggregating failures
    FROM whylabs.analysis d CROSS JOIN parameters p
    WHERE d.org_id = p.orgId
      AND d.dataset_id=ANY(p.datasetIds)
      AND d.dataset_timestamp >= p.startTS
      AND d.dataset_timestamp < p.endTS
      AND (includeUnhelpful or (d.user_marked_unhelpful != true or d.user_marked_unhelpful is null))
      AND (array_length(p.segments, 1) is null or d.segment=ANY(p.segments))
      AND (array_length(p.excludeSegments, 1) is null or d.segment<>ANY(p.excludeSegments))
      AND (array_length(p.monitorIds, 1) is null or d.monitor_ids && p.monitorIds)
      AND (array_length(p.analyzerIds, 1) is null or d.analyzer_id=ANY(p.analyzerIds))
      AND (array_length(p.runIds, 1) is null or cast(d.run_id as text)=ANY(p.runIds))
      AND (array_length(p.columnNames, 1) is null or d.column_name=ANY(p.columnNames))
      AND (p.granularityInclusion = 'BOTH' or (p.granularityInclusion = 'INDIVIDUAL_ONLY' and coalesce(d.disable_target_rollup, false)) or (p.granularityInclusion = 'ROLLUP_ONLY' and not coalesce(d.disable_target_rollup, false)))
      AND (p.parentChildScope = 'BOTH' or (p.parentChildScope = 'PARENTS_ONLY' and coalesce(d.parent, false)) or (p.parentChildScope = 'CHILDREN_ONLY' and not coalesce(d.parent, false)))
    GROUP BY d.dataset_id, timestamp
        )

SELECT * FROM events
