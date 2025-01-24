alter table whylabs.debug_events drop column if exists tags;
alter table whylabs.debug_events add column if not exists tags text[];