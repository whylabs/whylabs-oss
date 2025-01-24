update whylabs.entity_schema
set
   version = entity_schema.version + 1
where org_id = ? and dataset_id = ?
RETURNING id
