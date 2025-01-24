
insert into whylabs.column_schema(entity_schema_id, column_name, discreteness, classifier, data_type, metadata, last_updated, tags)
values (?, ?, ?::discreteness_enum, ?::classifier_enum, ?::data_type_enum, null, now(), ?::text[])
ON CONFLICT (entity_schema_id, column_name) DO UPDATE set
    discreteness = coalesce(excluded.discreteness, column_schema.discreteness),
    classifier = coalesce(excluded.classifier, column_schema.classifier),
    data_type = coalesce(excluded.data_type, column_schema.data_type),
    metadata = coalesce(excluded.metadata, column_schema.metadata),
    last_updated = excluded.last_updated,
    tags = coalesce(excluded.tags, column_schema.tags)
;




