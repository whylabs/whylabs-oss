CREATE TYPE bulk_load_mode_enum AS ENUM (  'insert', 'replace');
CREATE TYPE bulk_load_status_enum AS ENUM (  'started', 'finished', 'failed');

 -- Pardon the weird naming, these columns are otherwise reserved words
CREATE TABLE IF NOT EXISTS whylabs.bulk_load_audit (
    id           uuid NOT NULL PRIMARY KEY,
    load_start        timestamptz,
    load_end          timestamptz,
    status       bulk_load_status_enum,
    load_table        text,
    load_mode         bulk_load_mode_enum
);
