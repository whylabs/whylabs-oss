UPDATE whylabs.custom_dashboards SET
    display_name = coalesce(?, custom_dashboards.display_name),
    schema = coalesce(?, custom_dashboards.schema),
    is_favorite = coalesce(?, custom_dashboards.is_favorite)
WHERE org_id = ? and id = ?