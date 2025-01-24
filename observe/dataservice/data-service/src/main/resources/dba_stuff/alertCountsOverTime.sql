explain analyse WITH parameters (orgId, granularity, datasetIds, startTS, endTS, segments, monitorIds, analyzerIds, runIds, columnNames) as (
     values ('org-0', 'day', CAST('{"model-0"}' as text[]),
             to_timestamp(1678752000000/1000),to_timestamp(1685467973),
             CAST('{}' as text[]),
             CAST('{  }' as text[]),
             CAST('{  }' as text[]),
             CAST('{}' as text[]),
             CAST('{}' as text[]))
),

     events as (select sum(d.anomaly_count) as anomalies,
                       d.column_name as columnName,
                       d.metric as metric,
                       d.dataset_id as datasetId,
                       extract(epoch from date_trunc(p.granularity, d.dataset_timestamp AT TIME ZONE 'UTC'))*1000 as timestamp
                from whylabs.analysis d CROSS JOIN parameters p
                where d.org_id = p.orgId
                  and d.anomaly_count = 1
                  AND d.dataset_id=ANY(p.datasetIds)
                  AND d.dataset_timestamp >= p.startTS
                  AND d.dataset_timestamp < p.endTS
                  AND (array_length(p.segments, 1) is null or d.segment=ANY(p.segments))
                  AND (array_length(p.columnNames, 1) is null or d.column_name=ANY(p.columnNames))
                  AND (array_length(p.monitorIds, 1) is null or d.monitor_ids && p.monitorIds)
                  AND (array_length(p.analyzerIds, 1) is null or d.analyzer_id=ANY(p.analyzerIds))
                  AND (array_length(p.runIds, 1) is null or cast(d.run_id as text)=ANY(p.runIds))
                group by datasetId, timestamp, columnName, metric
     )

select * from events order by timestamp