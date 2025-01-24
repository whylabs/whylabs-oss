create type model_type_enum as enum ('llm');
alter table whylabs.entity_schema add column IF NOT EXISTS model_type model_type_enum;