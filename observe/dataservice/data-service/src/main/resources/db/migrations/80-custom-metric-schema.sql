CREATE TABLE if not exists whylabs.custom_metric_schema(
    id                          bigserial PRIMARY KEY,
    name                        text,
    last_updated                timestamptz,
    updated_by                  text,
    entity_schema_id            bigint REFERENCES whylabs.entity_schema (id),
    label                       text,
    column_name                 text,
    builtin_metric              text,
    unique (entity_schema_id, name)
    );

-- Most common access pattern is to retrieve all custom metrics
CREATE INDEX IF NOT EXISTS custom_metric_schema_idx
    ON whylabs.custom_metric_schema USING gin (entity_schema_id);


