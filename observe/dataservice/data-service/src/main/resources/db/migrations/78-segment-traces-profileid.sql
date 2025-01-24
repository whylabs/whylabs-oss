alter table whylabs.segment_traces add column if not exists profile_id Numeric;

COMMENT ON COLUMN whylabs.segment_traces.profile_id IS 'identifies specific profile within model';
