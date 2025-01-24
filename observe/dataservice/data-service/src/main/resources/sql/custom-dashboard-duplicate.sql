BEGIN;
WITH prev AS (
    SELECT display_name, schema FROM whylabs.custom_dashboards where custom_dashboards.id = :id and org_id = :orgId
),
     index_track AS (
         SELECT coalesce(sum(next_available_index), 1) as next_id from whylabs.custom_dashboards_index_track where org_id = :orgId
     )
INSERT INTO whylabs.custom_dashboards(id, display_name, author, schema, org_id)
SELECT concat('dashboard-', index_track.next_id), concat(prev.display_name, ' copy'), :author, prev.schema, :orgId
FROM prev, index_track;
-- It will only insert if we had an issue with database and lost the org register
-- if we are copying a dashboard, so we can assume that we have index tracking
INSERT INTO whylabs.custom_dashboards_index_track(org_id, next_available_index) values (:orgId, 2)
-- If we already have index tracking for the org, it will use atomic increment
ON CONFLICT(org_id) DO UPDATE set next_available_index = custom_dashboards_index_track.next_available_index + 1;
COMMIT;