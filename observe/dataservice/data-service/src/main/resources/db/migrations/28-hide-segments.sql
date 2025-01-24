alter table whylabs.legacy_segments add column hidden boolean default false;

-- As one generally only cares about non-hidden segments we provide a view for convenience
create view whylabs.legacy_segments_visible as select * from whylabs.legacy_segments where hidden != true;