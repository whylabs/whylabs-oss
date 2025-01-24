
insert into whylabs.custom_metric_schema(entity_schema_id, name, column_name, builtin_metric, label, last_updated)
values (?, ?, ?, ?, ?, now())
ON CONFLICT (entity_schema_id, name) DO UPDATE set
    column_name = excluded.column_name,
    builtin_metric = excluded.builtin_metric,
    label = excluded.label,
    last_updated = excluded.last_updated
;




