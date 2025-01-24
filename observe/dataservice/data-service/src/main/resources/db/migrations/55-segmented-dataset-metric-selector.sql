-- Index scanning very wide datasets for segmented regression metrics is too much data. Our
-- dataset metrics have a null column and in PG null != null, so you don't get any index selectivity by null columns.
-- Thus dataset metrics require an index by metric name rather than column name and they have to be GIN for the
-- json comparison to work.

CREATE INDEX IF NOT EXISTS profiles_hypertable_segmented_dataset_metric_json  ON whylabs.profiles_segmented_hypertable USING gin (org_id, dataset_id, segment_text , metric_path);
 --WITH (timescaledb.transaction_per_chunk) ;
CREATE INDEX IF NOT EXISTS profiles_hypertable_segmented_dataset_metric_staging_json  ON whylabs.profiles_segmented_staging USING gin (org_id, dataset_id, segment_text , metric_path);
 --WITH (timescaledb.transaction_per_chunk) ;

--
-- If only hitting profiles_hypertable_segmented_json index you get
--     Index Cond: (((org_id)::text = 'org-WUMQbe'::text) AND ((dataset_id)::text = 'model-5'::text))
-- With this index its able to narrow down to
--     Index Cond: (((org_id)::text = 'org-WUMQbe'::text) AND ((dataset_id)::text = 'model-5'::text) AND ((metric_path)::text = 'model/regression'::text))
--explain                             WITH parameters (orgId, datasetId, startTS, endTS, granularity, segment_tags, segmentKey) as (
--
--    values ('org-WUMQbe', 'model-5', CAST('2022-11-28 00:00:00+00' as TIMESTAMP)  at time zone 'UTC', CAST('2022-12-29 23:59:59.999+00' as TIMESTAMP)  at time zone 'UTC', 'millennium', CAST('{}' as text[]), 'age_category')
--),
--                                         single_org as (select date_trunc(granularity, dataset_timestamp AT TIME ZONE 'UTC') as timestamp,
--                                                               (select a.tag
--                                                                from jsonb_array_elements_text(segment_text) as a(tag)
--                                                                where a.tag like CONCAT(segmentKey, '=%'))                      tag,
--                                                               *
--                                                        from whylabs.profiles_segmented v
--                                                                CROSS JOIN parameters as p
--                                                        where org_id = p.orgId
--                                                          AND dataset_id = p.datasetId
--                                                          AND dataset_timestamp >= p.startTS
--                                                          AND dataset_timestamp < p.endTS
--                                                          and metric_path = 'model/regression'
--                                                          AND (
--                                                                (segment_tags = CAST('{}' as text[]))
--                                                                OR
--                                                                (segment_text ?& segment_tags))
--                                                          AND (segmentKey is null OR EXISTS ( select from jsonb_array_elements_text(segment_text) tag
--                                                                                              where tag like CONCAT(segmentKey, '=%')))
--                                                         AND regression_profile is not null
--                                         )

--                                    select row_number() OVER () AS id, extract(epoch from timestamp)*1000 as timestamp, tag, regression_profile as metrics from single_org
--                                    order by timestamp
--                                            asc;