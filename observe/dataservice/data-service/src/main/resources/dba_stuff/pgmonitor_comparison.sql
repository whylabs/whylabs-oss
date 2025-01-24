select * from whylabs.pg_monitor_schedule order by target_bucket asc limit 100;

select count(*) from whylabs.analysis_anomalies where dataset_timestamp > '2024-08-02' and dataset_timestamp < '2024-08-18';
--12321

select count(*) from whylabs.analysis_anomalies_pg where dataset_timestamp > '2024-08-02' and dataset_timestamp < '2024-08-18';
-- 28982


select count(*) as c , analyzer_type from whylabs.analysis_anomalies where dataset_timestamp > '2024-10-02' and dataset_timestamp < '2024-10-04' group by analyzer_type order by c desc;
--

select count(*) as c , analyzer_type from whylabs.analysis_anomalies_pg where dataset_timestamp > '2024-10-02' and dataset_timestamp < '2024-10-04' group by analyzer_type order by c desc;
--


select count(*) from whylabs.analysis_non_anomalies where dataset_timestamp > '2024-08-02' and dataset_timestamp < '2024-08-18';
select count(*) from whylabs.analysis_non_anomalies_pg where dataset_timestamp > '2024-08-02' and dataset_timestamp < '2024-08-18';


select count(*) as c , org_id, dataset_id from whylabs.analysis_anomalies where dataset_timestamp > '2024-10-02' and dataset_timestamp < '2024-10-04' group by org_id, dataset_id order by c desc;
--

select count(*) as c , org_id, dataset_id from whylabs.analysis_anomalies_pg where dataset_timestamp > '2024-10-02' and dataset_timestamp < '2024-10-04' group by org_id, dataset_id order by c desc;


select sum(baseline_batches_with_profile_count) as c , org_id, dataset_id from whylabs.analysis_anomalies where dataset_timestamp > '2024-08-02' and dataset_timestamp < '2024-08-04' group by org_id, dataset_id order by c desc;
--

select sum(baseline_batches_with_profile_count) as c , org_id, dataset_id from whylabs.analysis_anomalies_pg where dataset_timestamp > '2024-08-02' and dataset_timestamp < '2024-08-04' group by org_id, dataset_id order by c desc;



select count(*)  from whylabs.adhoc_async_analysis_queue_scheduled;

select count(*) as c, run_id  from whylabs.adhoc_async_analysis_queue_scheduled group by run_id order by c desc;
select * from whylabs.adhoc_async_requests where run_id = '4cc1e812-3782-4f12-bc6f-b6812377722c';

update whylabs.global_system set monitor_worker_concurrency = 128;

select * from whylabs.adhoc_async_requests where analyzer_id = 'uninterested-blueviolet-reindeer-9950-analyzer';

select * from whylabs.pg_monitor_schedule  where analyzer_id = 'uninterested-blueviolet-reindeer-9950-analyzer';

select * from whylabs.adhoc_async_analysis_queue_scheduled where run_id = '110177c9-d513-4ccc-8c5b-b30c4068997d';

select count(*) from whylabs.analysis where analyzer_id = 'uninterested-blueviolet-reindeer-9950-analyzer' and dataset_timestamp > '2024-10-02' and dataset_timestamp < '2024-10-04';

select * from whylabs.analysis_anomalies_pg where analysis_id = '5d32274c-b13a-3a99-8bc9-db8647575917';
select * from whylabs.adhoc_async_requests where run_id  in ('6d5aa870-1c66-4c26-ad97-4827a4f4991d', '048c6c94-517d-4a5e-836c-b9af1a781254');
select * from whylabs.adhoc_async_requests where run_id ='048c6c94-517d-4a5e-836c-b9af1a781254';

select * from whylabs.pg_monitor_schedule where analyzer_id = 'excited-rosybrown-elephant-8028-analyzer';

select * from whylabs.adhoc_async_requests where analyzer_id = 'excited-rosybrown-elephant-8028-analyzer';

-- Validate missing datapoint
select count(*), org_id, dataset_id from whylabs.analysis_anomalies where dataset_timestamp >= '2024-08-29' and metric = 'missingDatapoint'  group by  metric, org_id, dataset_id;
select count(*), org_id, dataset_id from whylabs.analysis_anomalies_pg where dataset_timestamp >= '2024-08-29' and metric = 'missingDatapoint'  group by  metric, org_id, dataset_id;

select * from whylabs.pg_monitor_schedule where org_id = 'org-JR37ks' and dataset_id = 'model-3';

select * from whylabs.adhoc_async_requests where org_id = 'org-JR37ks' and dataset_id = 'model-3' and analyzer_id = 'missing-datapoint-analyzer' order by created_timestamp desc;

select max(dataset_timestamp) from whylabs.profile_upload_audit where org_id = 'org-JR37ks' and dataset_id = 'model-3';

select * from whylabs.analysis_pg where run_id = '3fafd1dd-a5b0-440e-af19-c7f3dd38168d';

select now();

select count(*) as count, analyzer_type from whylabs.analysis_anomalies where dataset_timestamp > '2024-10-02' and dataset_timestamp < '2024-10-04' and org_id = 'org-0' and dataset_id = 'model-0' group by analyzer_type order by count desc;
select count(*) as count, analyzer_type from whylabs.analysis_anomalies_pg where dataset_timestamp > '2024-10-02' and dataset_timestamp < '2024-10-04' and org_id = 'org-0' and dataset_id = 'model-0' group by analyzer_type order by count desc;

select count(*) as count, analyzer_id from whylabs.analysis_anomalies where dataset_timestamp > '2024-10-02' and dataset_timestamp < '2024-10-04' and org_id = 'org-0' and dataset_id = 'model-0' group by analyzer_id order by count desc;
select count(*) as count, analyzer_id from whylabs.analysis_anomalies_pg where dataset_timestamp > '2024-10-02' and dataset_timestamp < '2024-10-04' and org_id = 'org-0' and dataset_id = 'model-0' group by analyzer_id order by count desc;

select count(*) as count, column_name, org_id, dataset_id from whylabs.analysis_anomalies where analyzer_id = 'magnificent-teal-hornet-9307-analyzer' and  dataset_timestamp > '2024-10-02' and dataset_timestamp < '2024-10-04'  group by column_name, org_id, dataset_id;
select count(*) as count, column_name from whylabs.analysis_anomalies_pg where analyzer_id = 'magnificent-teal-hornet-9307-analyzer' and  dataset_timestamp > '2024-10-02' and dataset_timestamp < '2024-10-04'  group by column_name;

select analysis_anomalies.dataset_timestamp,analysis_anomalies.column_name, analysis_anomalies.anomaly_count as anomaly_count_batch, analysis_pg.anomaly_count as anomaly_count_pg,
       analysis_anomalies.drift_metric_value as drift_metric_value_batch, analysis_pg.drift_metric_value as drift_metric_value_pg
        from whylabs.analysis_anomalies
           left join whylabs.analysis_pg on analysis_anomalies.analysis_id = analysis_pg.analysis_id
where analysis_anomalies.analyzer_id = 'magnificent-teal-hornet-9307-analyzer' and  analysis_anomalies.dataset_timestamp > '2024-10-02' and analysis_anomalies.dataset_timestamp < '2024-10-04' order by anomaly_count_pg asc;

select * from whylabs.analysis_pg where analyzer_id = 'uninterested-blueviolet-reindeer-9950-analyzer' and  dataset_timestamp > '2024-10-02' and dataset_timestamp < '2024-10-04' and column_name = 'acc_now_delinq';

select anomaly_count, analysis_id, dataset_timestamp from whylabs.analysis where analyzer_id = 'uninterested-blueviolet-reindeer-9950-analyzer' and dataset_timestamp > '2024-10-02' and dataset_timestamp < '2024-10-04' ;
select count(*) from whylabs.analysis_pg where analyzer_id = 'uninterested-blueviolet-reindeer-9950-analyzer' and dataset_timestamp > '2024-10-02' and dataset_timestamp < '2024-10-04';

select count(*) as count, org_id, analyzer_id from whylabs.analysis_anomalies where dataset_timestamp > '2024-10-02' and dataset_timestamp < '2024-10-10' and org_id = 'org-0' and dataset_id = 'model-0' group by analyzer_id, org_id order by count desc;
select count(*) as count, org_id, analyzer_id from whylabs.analysis_anomalies_pg where dataset_timestamp > '2024-10-02' and dataset_timestamp < '2024-10-10' and org_id = 'org-0' and dataset_id = 'model-0' group by analyzer_id, org_id order by count desc;

select analysis.drift_metric_value - analysis_pg.drift_metric_value as drift_metric_value_diff,
       analysis.drift_metric_value as drift_metric_value_batch, analysis_pg.drift_metric_value as drift_metric_value_pg,
       analysis.dataset_timestamp,analysis.baseline_batches_with_profile_count as baseline_batch,analysis_pg.baseline_batches_with_profile_count as baseline_pg,
       analysis.column_name, analysis.anomaly_count as anomaly_count_batch, analysis_pg.anomaly_count as anomaly_count_pg

        from whylabs.analysis
        left join whylabs.analysis_pg on analysis.analysis_id = analysis_pg.analysis_id
where analysis.analyzer_id = 'drab-ivory-echidna-787-analyzer' and  analysis.dataset_timestamp > '2024-09-20' and analysis.dataset_timestamp < '2024-10-10' order by drift_metric_value_diff desc;

-- Discrete drift on freq items is a BS analyzer config
select anomaly_count, drift_metric_value, drift_threshold,run_id,* from whylabs.analysis_pg where analyzer_id = 'drab-ivory-echidna-787-analyzer' and column_name = 'zip_code' and dataset_timestamp > '2024-09-24' and dataset_timestamp < '2024-09-26'  and org_id = 'org-0' and dataset_id = 'model-0'
union all select anomaly_count, drift_metric_value, drift_threshold,run_id,* from whylabs.analysis where analyzer_id = 'drab-ivory-echidna-787-analyzer' and column_name = 'zip_code' and dataset_timestamp > '2024-09-24' and dataset_timestamp < '2024-09-26'  and org_id = 'org-0' and dataset_id = 'model-0'
;

select count(*) as count, org_id, metric from whylabs.analysis_anomalies where dataset_timestamp > '2024-10-02' and dataset_timestamp < '2024-10-10' and org_id = 'org-0' and dataset_id = 'model-0'  group by metric, org_id order by metric, org_id asc;
select count(*) as count, org_id, metric from whylabs.analysis_anomalies_pg where dataset_timestamp > '2024-10-02' and dataset_timestamp < '2024-10-10' and org_id = 'org-0' and dataset_id = 'model-0' group by metric, org_id order by metric, org_id asc;

select count(*) as count, org_id, analyzer_id from whylabs.analysis_anomalies where dataset_timestamp > '2024-10-02' and dataset_timestamp < '2024-10-10' and org_id = 'org-0' and dataset_id = 'model-0' and metric = 'count' group by analyzer_id, org_id ;
select count(*) as count, org_id, analyzer_id from whylabs.analysis_anomalies_pg where dataset_timestamp > '2024-10-02' and dataset_timestamp < '2024-10-10' and org_id = 'org-0' and dataset_id = 'model-0'  and metric = 'count' group by analyzer_id, org_id ;


select analysis.dataset_timestamp,analysis.column_name, analysis.anomaly_count as anomaly_count_batch, analysis_pg.anomaly_count as anomaly_count_pg,
       analysis.drift_metric_value as drift_metric_value_batch, analysis_pg.drift_metric_value as drift_metric_value_pg,
    analysis.baseline_batches_with_profile_count as baseline_batches_with_profile_count_batch, analysis_pg.baseline_batches_with_profile_count as baseline_batches_with_profile_count_pg
from whylabs.analysis
         left join whylabs.analysis_pg on analysis.analysis_id = analysis_pg.analysis_id
where analysis.analyzer_id = 'victorious-antiquewhite-ostrich-2246-analyzer' and analysis.column_name = 'zip_code' and  analysis.dataset_timestamp > '2024-11-05' and  analysis_pg.dataset_timestamp > '2024-11-05' order by anomaly_count_pg asc;

select * from whylabs.analysis where analysis.analyzer_id = 'victorious-antiquewhite-ostrich-2246-analyzer' and analysis.column_name = 'zip_code' and  analysis.dataset_timestamp > '2024-11-05'
union all select * from whylabs.analysis_pg  where analyzer_id = 'victorious-antiquewhite-ostrich-2246-analyzer' and column_name = 'zip_code' and  dataset_timestamp > '2024-11-05';

select * from whylabs.profile_upload_audit where org_id = 'org-0' and dataset_id = 'model-0' and dataset_timestamp > '2024-11-06';