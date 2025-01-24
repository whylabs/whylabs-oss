-- Query to merge and move data from the staging table we stream into => historical hypertable

--explain with deleted as (delete from whylabs.profiles_overall_staging where org_id = '' and dataset_id = '' returning *)
with deleted as (delete from whylabs.profiles_overall_staging where org_id = ? and dataset_id = ? and dataset_timestamp >= ? and dataset_timestamp <= ?  returning *),

-- Roll up everything we can to the hour
merged as (select
                        mergeable_segment,
                    dataset_type,
                    -- Note: date truncation happens in profileService
                    dataset_timestamp,
                    org_id,
                    dataset_id,
                    column_name,
                    metric_path,
                    -- Multiple traceIds could get rolled up, promote a sample of 1
                    (ARRAY_AGG(trace_id) FILTER (WHERE trace_id IS NOT NULL))[1] as trace_id,
                    -- merging the metrics here
                    sum(d_sum)                                                    as d_sum,
                    min(d_min)                                                    as d_min,
                    max(d_max)                                                    as d_max,
                    sum(n_sum)                                                    as n_sum,
                    min(n_min)                                                    as n_min,
                    max(n_max)                                                    as n_max,
                    max(last_upload_ts)                                          as last_upload_ts,
                    min(first_upload_ts)                                         as first_upload_ts,
                    whylabs.variance_tracker(variance)                            as variance,
                    kll_double_sketch_merge(kll, 1024)                            as kll,
                    classification_merge(classification_profile)                  as classification_profile,
                    regression_merge(regression_profile)                          as regression_profile,
                    frequent_strings_sketch_merge(7, case
                                                         when length(CAST(frequent_items as bytea)) > 8
                                                             then frequent_items
                        end)                                                      as frequent_items,
                    hll_sketch_union(hll)                                         as hll
                from deleted
                where unmergeable_d is null and mergeable_segment != false and last_upload_ts > ?
group by org_id, dataset_id, column_name, dataset_type, dataset_timestamp, metric_path, mergeable_segment),
    i as (
        -- Insert the rolled up data into the historical table
        insert into whylabs.profiles_overall_hypertable (classification_profile, regression_profile, mergeable_segment, dataset_type, dataset_timestamp, org_id, dataset_id, column_name, metric_path, d_sum, d_min, d_max, n_sum, n_min, n_max, last_upload_ts, first_upload_ts, variance, kll, frequent_items, hll, trace_id)
        select classification_profile, regression_profile, mergeable_segment, dataset_type, dataset_timestamp, org_id, dataset_id, column_name, metric_path, d_sum, d_min, d_max, n_sum, n_min, n_max, last_upload_ts, first_upload_ts, variance, kll, frequent_items, hll, trace_id from merged
        order by org_id desc, dataset_id desc, column_name desc, dataset_type desc, metric_path desc, dataset_timestamp desc
    ),
    columns as (
        select org_id, dataset_id, column_name, dataset_timestamp, min(first_upload_ts) as earliest_ingest_timestamp from merged
        group by org_id, dataset_id, column_name, dataset_timestamp
    )
    -- Queue up unprocessed updates to the column_stats table. It'll get processed in a separate transaction to keep data promotion transactions as narrowly sccoped as possible.
     insert into whylabs.columns_new_arrival_queue (org_id, dataset_id, column_names, dataset_timestamp, earliest_ingest_timestamp, queued, segment_text)
            select org_id, dataset_id, ARRAY_AGG(column_name) as column_names, dataset_timestamp, min(earliest_ingest_timestamp) as earliest_ingest_timestamp, now(), '[]'::jsonb from columns group by org_id, dataset_id, dataset_timestamp ;



