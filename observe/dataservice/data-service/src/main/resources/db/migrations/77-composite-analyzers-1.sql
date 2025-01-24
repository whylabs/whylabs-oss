alter table whylabs.analysis_anomalies add column if not exists child_analyzer_ids text[];
alter table whylabs.analysis_anomalies add column if not exists child_analysis_ids text[];
alter table whylabs.analysis_anomalies add column if not exists parent bool;

COMMENT ON COLUMN whylabs.analysis_anomalies.parent IS 'This is a composite analyzer';

