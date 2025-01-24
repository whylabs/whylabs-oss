INSERT INTO whylabs.custom_dashboards(id, display_name, author, schema, org_id)
VALUES ( ?, ?, ?, ?, ? );
-- It will only insert if there's no data for the org, and since we just used the next_index above,
-- we have to create with 2 as the next.
INSERT INTO whylabs.custom_dashboards_index_track(org_id, next_available_index) values (?, 2)
-- If we already have index tracking for the org, it will use atomic increment
ON CONFLICT(org_id) DO UPDATE set next_available_index = custom_dashboards_index_track.next_available_index + 1;