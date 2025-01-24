insert into whylabs.column_schema(entity_schema_id, column_name, discreteness, classifier, data_type, metadata, last_updated, tags)
-- values (1, 'foo', 'discrete'::discreteness_enum, 'input'::classifier_enum, 'BOOLEAN'::data_type_enum, null, now(), null::text[])
values (?, ?, ?::discreteness_enum, ?::classifier_enum, ?::data_type_enum, null, now(), ?::text[])
ON CONFLICT (entity_schema_id, column_name) DO UPDATE
    set
        data_type = excluded.data_type,
        discreteness = excluded.discreteness,
        classifier = excluded.classifier,
        metadata = coalesce(excluded.metadata, column_schema.metadata),
        last_updated = excluded.last_updated,
        tags = coalesce(excluded.tags, column_schema.tags)
where  whylabs.column_schema.data_type='NULL'::data_type_enum and whylabs.column_schema.data_type<>excluded.data_type

