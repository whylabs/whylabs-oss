-- Entity Schema

-- Make this change idempotent (create type doesn't offer does not offer 'if not exist' as an option)

create type discreteness_enum as enum ('discrete', 'continuous');
create type classifier_enum as enum ('input', 'output');
create type data_type_enum as enum ('INTEGRAL',
    'FRACTIONAL',
    'bool',
    'STRING',
    'UNKNOWN',
    'NULL',
    'UNRECOGNIZED');

CREATE TABLE if not exists whylabs.entity_schema (
                                       id                          bigserial PRIMARY KEY,
                                       org_id                      text,
                                       dataset_id                  text,
                                       version                     integer,
                                       schema_version              integer,
                                       updated_timestamp           timestamptz,
                                       author                      text,
                                       description                 text,
                                       unique (org_id, dataset_id)
);

CREATE INDEX IF NOT EXISTS entity_schema_idx
    ON whylabs.entity_schema USING gin (org_id, dataset_id);

CREATE TABLE if not exists whylabs.column_schema(
                                      id                          bigserial PRIMARY KEY,
                                      column_name                 text,
                                      first_seen                  timestamptz,
                                      last_updated                timestamptz,
                                      updated_by                  text,
                                      entity_schema_id            bigint REFERENCES whylabs.entity_schema (id),
                                      discreteness                discreteness_enum,
                                      classifier                  classifier_enum,
                                      data_type                   data_type_enum,
                                      description                 text,
                                      tags                        text[],
                                      metadata                    jsonb,
                                      hidden                      boolean default false,
                                      unique (entity_schema_id, column_name)
);

COMMENT ON COLUMN whylabs.column_schema.updated_by IS 'Who was doing the profiling when this column first appeared';
COMMENT ON COLUMN whylabs.column_schema.first_seen IS 'First time this column got logged for this dataset (updated async)';

-- Most common access pattern is gonna be retrieve all columns, so a gin for the org+dataset combo should work nicely
CREATE INDEX IF NOT EXISTS column_schema_idx
    ON whylabs.column_schema USING gin (entity_schema_id);


