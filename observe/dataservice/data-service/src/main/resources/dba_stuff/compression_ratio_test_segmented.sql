drop table whylabs.compression_test_segmented;
create table whylabs.compression_test_segmented as select * from whylabs.profiles_segmented_hypertable where dataset_timestamp >= '2024-03-01' and dataset_timestamp < '2024-03-05';
ALTER TABLE whylabs.compression_test_segmented ALTER COLUMN org_id TYPE text;
ALTER TABLE whylabs.compression_test_segmented ALTER COLUMN dataset_id TYPE text;
ALTER TABLE whylabs.compression_test_segmented ALTER COLUMN column_name TYPE text;
ALTER TABLE whylabs.compression_test_segmented ALTER COLUMN metric_path TYPE text;
SELECT create_hypertable('whylabs.compression_test_segmented','dataset_timestamp', chunk_time_interval => interval '7 day', create_default_indexes => FALSE, migrate_data := true);

select show_chunks('whylabs.compression_test_segmented');

select * FROM chunk_compression_stats('whylabs.compression_test_segmented');

CALL recompress_chunk('_timescaledb_internal._hyper_116_256249_chunk', );


SELECT hypertable_size('whylabs.compression_test_segmented');

-- 28449882112  28gb

ALTER TABLE whylabs.compression_test_segmented SET (
    timescaledb.compress,    timescaledb.compress_segmentby = 'org_id, dataset_id, segment_text',timescaledb.compress_orderby = 'column_name, metric_path, dataset_timestamp desc');

delete from whylabs.compression_test_segmented;

select count (*) from whylabs.compression_test_segmented;
insert into whylabs.compression_test_segmented select * from whylabs.compression_test_segmented limit 1;
SELECT compress_chunk(i, if_not_compressed => true) FROM show_chunks('whylabs.compression_test_segmented') i;

SELECT hypertable_size('whylabs.compression_test_segmented');
SELECT public.show_chunks('whylabs.compression_test_segmented');
CALL recompress_chunk('_timescaledb_internal._hyper_111_247492_chunk');

VACUUM (PARALLEL 3, verbose)  _timescaledb_internal._hyper_111_247492_chunk;
-- 5776908288  5gb  5.6x:1


--- Premature compression test, add data after chunks already compressed
create table whylabs.premature_compression_test_segmented as select * from whylabs.compression_test_segmented limit 10;
SELECT create_hypertable('whylabs.premature_compression_test_segmented','dataset_timestamp', chunk_time_interval => interval '7 day', create_default_indexes => FALSE, migrate_data := true);
ALTER TABLE whylabs.premature_compression_test_segmented SET (
    timescaledb.compress,    timescaledb.compress_segmentby = 'org_id, dataset_id, segment_text',timescaledb.compress_orderby = 'column_name, metric_path, dataset_timestamp desc');

SELECT compress_chunk(i, if_not_compressed => true) FROM show_chunks(                                            'whylabs.premature_compression_test_segmented') i;
insert into whylabs.premature_compression_test_segmented select * from whylabs.compression_test_segmented;
create index profiles_premature_hypertable_segmented_json
    on whylabs.compression_test_segmented using gin (org_id, dataset_id, segment_text, column_name);
create index profiles_premature_hypertable_segmented_dataset_metric_json
    on whylabs.compression_test_segmented using gin (org_id, dataset_id, segment_text, metric_path);
SELECT compress_chunk(i, if_not_compressed => true) FROM show_chunks(                                            'whylabs.premature_compression_test_segmented') i;
SELECT hypertable_size('whylabs.premature_compression_test_segmented');


CALL recompress_chunk('_timescaledb_internal._hyper_113_251989_chunk');
vacuum full _timescaledb_internal._hyper_113_251989_chunk;

SELECT public.show_chunks('whylabs.premature_compression_test_segmented');

SELECT chunk_schema || '.' || chunk_name FROM timescaledb_information.chunks where range_end < now() - Interval '97 days' and hypertable_name = any('{profiles_overall_hypertable, profiles_segmented_hypertable}');

select count(*) from whylabs.compression_test_segmented;

DELETE FROM whylabs.compression_test_segmented
WHERE ctid IN (
    SELECT ctid
    FROM whylabs.compression_test_segmented
    LIMIT 10000
);

-------

set jit = off;

explain analyze  WITH
                    -- IMPORTANT: merge ASAP to avoid creating large CTE in the heap
                    merged_metrics as (select date_trunc('day', dataset_timestamp AT TIME ZONE 'UTC') as timestamp,
                                              (select a.tag
                                               from jsonb_array_elements_text(segment_text) as a(tag)
                                               where a.tag like CONCAT('', '=%'))                     tag,
                                              -- profile_id is null on all but the unmerged table so we'll typically be grouping by
                                              -- an empty string (no-op). This allows us to only provide unmerged profile rollups on the
                                              -- unmerged table, and not having to fork this query for the individual profiles
                                              coalesce(profile_id, 0)                                    as profile_id,
                                              column_name,
                                              metric_path,
                                              -- merging the metrics here
                                              sum(d_sum)                                                    as d_sum,
                                              min(d_min)                                                    as d_min,
                                              max(d_max)                                                    as d_max,
                                              sum(n_sum)                                                    as n_sum,
                                              min(n_min)                                                    as n_min,
                                              max(n_max)                                                    as n_max,
                                              max(last_upload_ts)                                           as last_upload_ts,
                                              whylabs.variance_tracker(variance)                            as variance,
                                              kll_double_sketch_merge(kll, 4096)                                  as kll,
                                              frequent_strings_sketch_merge(7, case
                                                                                   when length(CAST(frequent_items as bytea)) > 8
                                                                                       then frequent_items
                                                  end)                                                      as frequent_items,
                                              hll_sketch_union(hll)                                         as hll,
                                              coalesce(array_agg(DISTINCT trace_id ORDER BY trace_id) FILTER (WHERE trace_id is not null), cast(array[] as text[]))   as trace_ids
                                       from whylabs.compression_test_segmented where
                                       --from whylabs.profiles_segmented_hypertable where
                                           org_id = 'org-hURArx'
                                                                                    AND dataset_id = 'model-25'
                                                                                    and             dataset_timestamp >= CAST('2024-03-01' as TIMESTAMP)  at time zone 'UTC'
                                                                                    AND dataset_timestamp < CAST('2024-03-05' as TIMESTAMP)  at time zone 'UTC'                                                       -- TODO: do not allow users to query all columns here. It's a bad patten
                                                                                    AND column_name is not null
                                                                                    and column_name = ANY (CAST('{frozen_or_disabled_neighbors_thru_hard_count_by_merchant_from_payment_merchant,total_count_distinct_postal_code_two_digit_prefix_from_card_link_attempts_by_ip_from_ip_address,activation_phone_service_discontinued_range_by_master_merchant_from_payment_master_merchant,total_cnp_count_by_merchant_from_payment_merchant,stddev_capture_amount_by_master_merchant_from_payment_master_merchant,millis_since_activation_by_master_merchant_from_payment_master_merchant,email_invalid_login_count_by_ip_from_ip_address,total_failed_settlement_count_by_merchant_from_payment_merchant,activation_connected_users_through_phone_count_by_master_merchant_from_payment_master_merchant,max_amount_external_bank_account_sent_credits_in_1w_by_merchant_from_payment_merchant,unique_issuer_count_in_4w_by_master_merchant_from_payment_master_merchant,transfer_cumulative_count_declined_cash_in_in_1d_by_ip_from_ip_address,miles_from_merchant_activation_zip_to_order_ip_by_master_merchant_from_payment_master_merchant,total_cnp_declined_amount_b_in_4w_by_merchant_from_payment_merchant,total_active_day_count_b_until_1d_by_merchant_from_payment_merchant,chargeback_rate_by_completed_gpv_offline_by_time_zone_from_time_zone,stddev_log_capture_amount_in_4w_by_merchant_from_payment_merchant,lev_distance_between_merchant_personal_and_bank_account_holder_name_by_merchant_from_payment_merchant,fraction_known_merchants_by_email_domain_from_email_domain,bad_merchant_count_v2_by_lat_lon_3_decimal_places_from_lat_lon_3_decimal_places,email_username_characters_unique_count_by_master_merchant_from_payment_master_merchant,cp_to_cnp_rate_by_amount_b_in_2w_by_master_merchant_from_payment_master_merchant,total_void_amount_by_merchant_from_payment_merchant,ratio_of_itemized_transactions_to_successful_payments_by_merchant_from_payment_merchant,ratio_activation_request_count_in_52w_vs_all_time_by_email_domain_from_invoice_buyer_email_domain,known_merchants_count_by_payment_location_state_from_payment_location_state,business_type_is_misc_retail_by_merchant_from_payment_merchant,foreign_card_rate_by_count_b_in_1w_by_master_merchant_from_payment_master_merchant,pan_diversity_by_merchant_from_payment_merchant,miles_from_merchant_activation_zip_to_shipping_zip_by_master_merchant_from_payment_master_merchant}' as text[]))
                                                                                    AND (
                            -- if tags are not specified, we match with all the segment entries (overall segment)
                            (CAST('{currency_code=AUD,event_sub_type=APPOINTMENTS}' as text[]) = CAST('{}' as text[]))
                                OR
                                -- if tags are specified, we match with a segment. This is legacy logic atm
                                -- https://stackoverflow.com/questions/66600968/usage-of-in-native-sql-query-on-jsonb
                                -- The backslashes escape hibernate parameter detection, and the two question-marks are the JDBC escape.
                            (segment_text ??& CAST('{currency_code=AUD,event_sub_type=APPOINTMENTS}' as text[])))
                                                                                    --(segment_text ??& :segment_tags))
                                                                                    AND (null is null OR EXISTS(select
                                                                                                                from jsonb_array_elements_text(segment_text) tag
                                                                                                                where tag like CONCAT('', '=%')))
                                       group by timestamp, tag, column_name, metric_path, profile_id
                    ),
                    n_sum_metrics as (select timestamp, tag, column_name, metric_path, profile_id, n_sum as longs
                                      from merged_metrics
                                      WHERE n_sum is not null),

                    n_min_metrics as (select timestamp, tag, column_name, metric_path, profile_id, n_min as longs
                                      from merged_metrics
                                      WHERE n_min is not null),
                    n_max_metrics as (select timestamp, tag, column_name, metric_path, profile_id, n_max as longs
                                      from merged_metrics
                                      WHERE n_max is not null),
                    d_sum_metrics as (select timestamp, tag, column_name, metric_path, profile_id, d_sum as doubles
                                      from merged_metrics
                                      WHERE d_sum is not null),
                    kll_stats as (select timestamp,
                                         tag,
                                         column_name,
                                         metric_path,
                                         profile_id,
                                         kll_double_sketch_get_n(kll) as longs,
                                         case
                                             when kll_double_sketch_get_n(kll) = 0 then CAST(array [null, null] as numeric[])
                                             else kll_double_sketch_get_quantiles(kll, array [0,1])
                                             end                      as minmax
                                  from merged_metrics
                                  WHERE kll is not null),

                    kll_n as (select
                                  timestamp,
                                  tag,
                                  column_name,
                                  concat(metric_path, '/n'),
                                  profile_id,
                                  longs
                              from kll_stats),

                    -- Start doubles metrics

                    kll_min as (select timestamp, tag, column_name, concat(metric_path, '/min'), profile_id, minmax[1] as doubles
                                from kll_stats
                                where minmax[1] is not null),

                    kll_max as (select timestamp, tag, column_name, concat(metric_path, '/max'), profile_id, minmax[2] as doubles
                                from kll_stats
                                where minmax[2] is not null),

                    stddev as (select
                                   timestamp,
                                   tag,
                                   column_name,
                                   'distribution/stddev',
                                   profile_id,
                                   ROUND(sqrt(whylabs.variance(variance)), 4) as doubles
                               from merged_metrics
                               WHERE variance is not NULL and variance[1] > 0 AND metric_path='distribution/variance'),
                    mean as (select timestamp, tag, column_name, 'distribution/mean', profile_id, variance[3] as doubles
                             from merged_metrics
                             WHERE variance is not NULL and variance[1] > 0 AND metric_path='distribution/variance'),

                    hll_agg as (select
                                    timestamp,
                                    tag,
                                    column_name,
                                    metric_path,
                                    profile_id,
                                    hll_sketch_get_estimate_and_bounds(hll) as hll
                                from merged_metrics
                                where hll is not null),

                    hll_est as (select timestamp, tag, column_name, replace(metric_path,  'cardinality/hll', 'cardinality/est'), profile_id, hll[1] as doubles
                                from hll_agg),

                    hll_upper as (select timestamp, tag, column_name, replace(metric_path,'cardinality/hll','cardinality/upper_1'),profile_id, hll[3] as doubles
                                  from hll_agg),

                    hll_lower as (select timestamp, tag, column_name, replace(metric_path,'cardinality/hll', 'cardinality/lower_1'), profile_id, hll[2] as doubles
                                  from hll_agg),

                    -- strings metrics
                    hll_sketch as (select timestamp, tag, column_name, metric_path, profile_id, CAST(hll as text) as strings
                                   from merged_metrics
                                   WHERE hll is not null),
                    kll_sketch as (select timestamp, tag, column_name, metric_path, profile_id, CAST(kll as text) as strings
                                   from merged_metrics
                                   WHERE kll is not null),
                    frequent_strings_sketch as (select
                                                    timestamp,
                                                    tag,
                                                    column_name,
                                                    metric_path,
                                                    profile_id,
                                                    CAST(frequent_items as text) as strings
                                                from merged_metrics
                                                WHERE frequent_items is not null),

                    unioned_results AS (
                        SELECT  timestamp, tag, column_name, metric_path, profile_id, longs, null as doubles, null as strings
                        FROM (
                                 select *
                                 from n_sum_metrics
                                 UNION ALL
                                 SELECT *
                                 FROM n_min_metrics
                                 UNION ALL
                                 SELECT *
                                 FROM n_max_metrics
                                 UNION ALL
                                 SELECT *
                                 from kll_n
                             ) as longs
                        UNION ALL
                        select
                            timestamp,
                            tag,
                            column_name,
                            metric_path,
                            profile_id,
                            CAST(null as numeric) as longs,
                            doubles,
                            null                  as strings
                        from (select *
                              from d_sum_metrics
                              union all
                              select *
                              from kll_min
                              union all
                              select *
                              from kll_max
                              UNION ALL
                              select *
                              from stddev
                              UNION ALL
                              select *
                              from mean
                              union all
                              select *
                              from hll_est
                              union all
                              select *
                              from hll_upper
                              union all
                              select *
                              from hll_lower
                             ) as doubles
                        union all
                        select
                            timestamp,
                            tag,
                            column_name,
                            metric_path,
                            profile_id,
                            CAST(null as numeric)          as longs,
                            CAST(null as double precision) as doubles,
                            strings
                        from (select *
                              from kll_sketch
                              union all
                              select * from hll_sketch
                              union all
                              select *
                              from frequent_strings_sketch) as strings
                        union all
                        (select
                             timestamp,
                             tag,
                             column_name,
                             'whylabs/last_upload_ts' as metric_path,
                             profile_id,
                             cast(EXTRACT(EPOCH FROM max(last_upload_ts)) * 1000 as numeric) as longs,
                             CAST(null as double precision) as doubles,
                             null                  as strings
                         from merged_metrics
                         group by 1, 2, 3, 5)
                        union all
                        (select
                             timestamp,
                             tag,
                             column_name,
                             'whylabs/traceid' as metric_path,
                             profile_id,
                             cast(null as numeric) as longs,
                             CAST(null as double precision) as doubles,
                             (array_agg(DISTINCT trace_ids[1]) filter(where trace_ids <> '{}'))[1] as strings
                         from merged_metrics
                         group by 1, 2, 3, 5)
                    ),
                    rows as (

                select row_number() OVER () AS id,
                       timestamp,
                       tag,
                       column_name,
                       metric_path,
                       profile_id,
                       longs,
                       doubles,
                       strings,
                       NULL as reference_id,
                       NULL as segment_text
                from unioned_results
                order by 2, 3, 4, 5)
select count(*) from rows;


-- Query to merge and move data from the staging table we stream into => historical hypertable
explain analyze
with deleted as (delete from whylabs.premature_compression_test_segmented where org_id = 'org-hURArx' and dataset_id = 'model-25'  returning *)
insert into whylabs.premature_compression_test_segmented (segment_text, classification_profile, regression_profile, mergeable_segment, dataset_type, dataset_timestamp, org_id, dataset_id, column_name, metric_path, d_sum, d_min, d_max, n_sum, n_min, n_max, last_upload_ts, first_upload_ts, variance, kll, frequent_items, hll, trace_id)

-- Roll up everything we can to the hour
with merged as (select
                    -- Can't group by jsonb so we have to turn it into an array
                    ARRAY(SELECT jsonb_array_elements_text(segment_text) as s order by 1 asc) as segment_text,
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
                where unmergeable_d is null and mergeable_segment != false
                group by segment_text, org_id, dataset_id, column_name, dataset_type, dataset_timestamp, metric_path, mergeable_segment)
-- Unroll the array back into jsonb on the result
select array_to_json(segment_text)::jsonb as segment_text, classification_profile, regression_profile, mergeable_segment, dataset_type, dataset_timestamp, org_id, dataset_id, column_name, metric_path, d_sum, d_min, d_max, n_sum, n_min, n_max, last_upload_ts, first_upload_ts, variance, kll, frequent_items, hll, trace_id from merged
order by org_id desc, dataset_id desc, column_name desc, dataset_type desc, segment_text desc, metric_path desc, dataset_timestamp desc;
