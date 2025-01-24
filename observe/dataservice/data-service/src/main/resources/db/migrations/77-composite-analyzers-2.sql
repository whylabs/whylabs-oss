alter table whylabs.analysis_non_anomalies add column if not exists child_analyzer_ids text[];
alter table whylabs.analysis_non_anomalies add column if not exists child_analysis_ids text[];
alter table whylabs.analysis_non_anomalies add column if not exists parent bool;

COMMENT ON COLUMN whylabs.analysis_non_anomalies.parent IS 'This is a composite analyzer';

create or replace view whylabs.analysis as select * from whylabs.analysis_anomalies union all select * from whylabs.analysis_non_anomalies;