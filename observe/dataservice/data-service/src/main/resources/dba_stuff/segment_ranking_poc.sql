

--lending club
explain analyze with primary_segment as (select sum(n_sum) as s, column_name, jsonb_array_elements(segment_text) as ps, segment_text
                                         from whylabs.profiles_segmented where org_id = 'org-0' and dataset_id = 'model-0' and column_name = 'zip_code'
                                                                           and dataset_timestamp > '2024-09-01' and dataset_timestamp < '2024-09-12'
                                         group by segment_text, column_name),
                     exploded as ( select s, ps, jsonb_array_elements(segment_text) as secondary_segment from primary_segment where starts_with(ps::text, '"verification_status=')),
                     aggregated as (select ps, secondary_segment,
                                           CASE WHEN secondary_segment = '"purpose=other"' THEN sum(s) END AS purpose_other,
                                           CASE WHEN secondary_segment = '"purpose=major_purchase"' THEN sum(s) END AS major_purchase
                                    from exploded where not starts_with(secondary_segment::text, '"verification_status=')
                                    group by ps, secondary_segment)
                select ps, sum(purpose_other) as purpose_other, sum(major_purchase) as major_purchase from aggregated group by ps;
;

explain analyze with primary_segment as (select sum(n_sum) as s, column_name, jsonb_array_elements(segment_text) as ps, segment_text
                                         from whylabs.profiles_segmented where org_id = 'org-hURArx' and dataset_id = 'model-3' and column_name = 'auth_gap_count_604800_to_2419200_seconds_by_card_from_payment_card'
                                                                           and dataset_timestamp > '2024-09-01' and dataset_timestamp < '2024-09-12'
                                         group by segment_text, column_name),
                     exploded as ( select s, ps, jsonb_array_elements(segment_text) as secondary_segment from primary_segment where starts_with(ps::text, '"currency_code=')),
                     aggregated as (select ps, secondary_segment,
                                           CASE WHEN secondary_segment = '"event_sub_type=BUYER_SUBSCRIPTIONS_ON_FILE"' THEN sum(s) END AS pivot1,
                                           CASE WHEN secondary_segment = '"event_sub_type=REGISTER_MANUALLY_KEYED"' THEN sum(s) END AS pivot2,
                                           CASE WHEN secondary_segment = '"event_sub_type=SUBSCRIPTION_DASHBOARD"' THEN sum(s) END AS pivot3
                                    from exploded where not starts_with(secondary_segment::text, '"currency_code=')
                                    group by ps, secondary_segment)
                select ps, sum(pivot1) as pivot1, sum(pivot2) as pivot2, sum(pivot3) as pivot3 from aggregated group by ps;
;


-- reddit
explain analyze with primary_segment as (select sum(n_sum) as s, column_name, jsonb_array_elements(segment_text) as ps, segment_text
                                         from whylabs.profiles_segmented where org_id = 'org-L46LM4' and dataset_id = 'model-13' and column_name = 'precision_k_25'
                                                                           and dataset_timestamp > '2024-01-01' and dataset_timestamp < '2024-09-12'
                                         group by segment_text, column_name),
                     exploded as ( select s, ps, jsonb_array_elements(segment_text) as secondary_segment from primary_segment where starts_with(ps::text, '"post_country_code=')),
                     aggregated as (select ps, secondary_segment,
                                           CASE WHEN secondary_segment = '"post_nsfw=false"' THEN sum(s) END AS pivot1,
                                           CASE WHEN secondary_segment = '"event_sub_type=REGISTER_MANUALLY_KEYED"' THEN sum(s) END AS pivot2,
                                           CASE WHEN secondary_segment = '"event_sub_type=SUBSCRIPTION_DASHBOARD"' THEN sum(s) END AS pivot3
                                    from exploded where not starts_with(secondary_segment::text, '"post_country_code=')
                                    group by ps, secondary_segment)
                select ps, sum(pivot1) as pivot1, sum(pivot2) as pivot2, sum(pivot3) as pivot3 from aggregated group by ps;
;
