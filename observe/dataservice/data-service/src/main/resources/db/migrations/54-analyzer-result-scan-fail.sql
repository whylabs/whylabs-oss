-- Useless
drop index if exists whylabs.analysis_anomalies_time_idx;
drop index if exists whylabs.analysis_non_anomalies_time_idx;

-- We have a v2 of these indices already
drop index if exists whylabs.anomaly_general_idx;
drop index if exists whylabs.non_anomaly_general_idx;


CREATE INDEX IF NOT EXISTS non_anomaly_gin
    ON whylabs.analysis_non_anomalies USING gin (org_id, dataset_id, analyzer_type, column_name, segment);
    --WITH (timescaledb.transaction_per_chunk);

CREATE INDEX IF NOT EXISTS anomaly_gin
    ON whylabs.analysis_anomalies USING gin (org_id, dataset_id, analyzer_type, column_name, segment);
    --WITH (timescaledb.transaction_per_chunk);


-- Query to repro the perf issue here https://us5.datadoghq.com/logs?query=service%3Adataservice-main%20env%3Aproduction%20-status%3A%28info%20OR%20warn%29&cols=host%2Cservice&index=%2A&messageDisplay=inline&stream_sort=desc&viz=stream&from_ts=1690261200000&to_ts=1690376040000&live=false
-- If you plan to change these gin indexes, make sure this query is still fast.
-- The reason these indices beat out the general b-tree is GIN is able to put the "column_name in (..)"
-- filters into the index condition so it does less index scanning for Square type customers with many columns. EG
 -- Index Cond: (((org_id)::text = 'org-eEEMEL'::text) AND ((dataset_id)::text = 'model-8'::text) AND ((analyzer_type)::text = 'drift'::text) AND ((column_name)::text = ANY ('{account_control_group_capped_time,account_level_flags,account_limit_amount,ach_bank_account_country,ach_bank_account_currency,ach_bank_account_fingerprint,ach_bank_account_issuing_bank,ach_bank_account_status,ach_bank_account_sub_type,ach_bank_account_type,ach_payment_source_id,alf_au_phishing_trend_Jul2022,alf_im_01187_affected_account_existing,alf_im_01187_affected_account_new_via_mobile,alf_im_01187_affected_account_new_via_web,alf_safe_1,alf_safe_10,alf_safe_2,alf_safe_3,alf_safe_4,alf_safe_5,alf_safe_6,alf_safe_7,alf_safe_8,alf_safe_9,alf_suspicious_1,alf_suspicious_10,alf_suspicious_2,alf_suspicious_3,alf_suspicious_4}'::text[])) AND ((segment)::text = ''::text))
--explain analyze select *
--from whylabs.analysis_non_anomalies d
--where d.org_id = 'org-eEEMEL'
--  and d.dataset_id in ('model-8')
--  and (1 = 0 or d.analyzer_type in ('drift'))
--  and (1 = 0 or d.segment in (''))
--  and (30 = 0 or d.column_name in ('account_control_group_capped_time', 'account_level_flags', 'account_limit_amount', 'ach_bank_account_country', 'ach_bank_account_currency', 'ach_bank_account_fingerprint', 'ach_bank_account_issuing_bank', 'ach_bank_account_status', 'ach_bank_account_sub_type', 'ach_bank_account_type', 'ach_payment_source_id', 'alf_au_phishing_trend_Jul2022', 'alf_im_01187_affected_account_existing', 'alf_im_01187_affected_account_new_via_mobile', 'alf_im_01187_affected_account_new_via_web', 'alf_safe_1', 'alf_safe_10', 'alf_safe_2', 'alf_safe_3', 'alf_safe_4', 'alf_safe_5', 'alf_safe_6', 'alf_safe_7', 'alf_safe_8', 'alf_safe_9', 'alf_suspicious_1', 'alf_suspicious_10', 'alf_suspicious_2', 'alf_suspicious_3', 'alf_suspicious_4'))
-- and d.dataset_timestamp >= '2023-07-07 00:00:00+00'
--  and d.dataset_timestamp < '2023-07-22 00:00:00+00';
