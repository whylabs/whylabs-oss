alter table whylabs.analysis_non_anomalies add column if not exists trace_ids text[];
alter table whylabs.analysis_non_anomalies add column if not exists analyzer_tags text[];
alter table whylabs.analysis_non_anomalies add column if not exists disable_target_rollup bool;

COMMENT ON COLUMN whylabs.analysis_non_anomalies.trace_ids IS 'ids such as database PK from the customer side used for correlation';
COMMENT ON COLUMN whylabs.analysis_non_anomalies.analyzer_tags IS 'Analyzers can be tagged stuff like llm_security so they can be grouped more easily';
COMMENT ON COLUMN whylabs.analysis_non_anomalies.disable_target_rollup IS 'The analyzer was configured not to roll up profile data, thus analyzing each profile independently';

create or replace view whylabs.analysis as select * from whylabs.analysis_anomalies union all select * from whylabs.analysis_non_anomalies;