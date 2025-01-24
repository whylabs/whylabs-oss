CREATE TABLE IF NOT EXISTS whylabs.custom_dashboards_index_track(
    org_id                 text                                            primary key,
    last_updated_timestamp timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
    next_available_index   int                                   NOT NULL
);

-- create function to set `last_updated_timestamp` when `whylabs.custom_dashboards_index_track` is updated
CREATE OR REPLACE FUNCTION update_timestamp_task()
    RETURNS TRIGGER AS $$
BEGIN
    NEW.last_updated_timestamp = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- create trigger to set `last_updated_timestamp` when `whylabs.custom_dashboards_index_track` is updated
CREATE OR REPLACE TRIGGER update_custom_dashboard_index_track_updated_on
    BEFORE UPDATE
    ON
        whylabs.custom_dashboards_index_track
    FOR EACH ROW
EXECUTE PROCEDURE update_timestamp_task();