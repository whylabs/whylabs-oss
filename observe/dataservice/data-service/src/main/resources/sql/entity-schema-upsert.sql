
insert into whylabs.entity_schema (org_id, dataset_id, version, schema_version, updated_timestamp, author, description, model_type) values (?, ?, ?, ?, ?, ?, ?, ?)
ON CONFLICT (org_id, dataset_id) DO UPDATE set
       version = greatest(entity_schema.version + 1, excluded.version, 1),
       updated_timestamp = coalesce(excluded.updated_timestamp, entity_schema.updated_timestamp),
       schema_version = greatest(entity_schema.schema_version, excluded.schema_version, 1),
       author = coalesce(excluded.author, entity_schema.author, 'system'),
       description = coalesce(excluded.description, entity_schema.description),
       model_type = coalesce(excluded.model_type, entity_schema.model_type)
RETURNING id
