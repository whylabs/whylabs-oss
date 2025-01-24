CREATE TABLE IF NOT EXISTS whylabs.custom_dashboards(
    id                     uuid        DEFAULT gen_random_uuid() NOT NULL primary key,
    creation_timestamp     timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
    last_updated_timestamp timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_timestamp      timestamptz,
    display_name           text                                  NOT NULL,
    author                 text,
    schema                 jsonb                                 NOT NULl,
    is_favorite            boolean     DEFAULT false,
    org_id                 text                                  NOT NULL
);

-- create function to set `last_updated_timestamp` when `whylabs.custom_dashboards` is updated
CREATE OR REPLACE FUNCTION update_last_updated_timestamp_task()
    RETURNS TRIGGER AS $$
BEGIN
    NEW.last_updated_timestamp = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- create trigger to set `last_updated_timestamp` when `whylabs.custom_dashboards` is updated
CREATE OR REPLACE TRIGGER update_custom_dashboard_updated_on
    BEFORE UPDATE
    ON
        whylabs.custom_dashboards
    FOR EACH ROW
EXECUTE PROCEDURE update_last_updated_timestamp_task();