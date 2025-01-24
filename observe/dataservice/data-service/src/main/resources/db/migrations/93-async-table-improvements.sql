
-- Fresh start, this isn't live yet
truncate whylabs.adhoc_async_analysis_queue;
truncate whylabs.adhoc_async_requests;

-- Maintain updated/inserted timestamps on the async requests table
CREATE OR REPLACE FUNCTION update_async_request_timestamp()
    RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_timestamp = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE TRIGGER update_async_request_timestamp_trigger BEFORE UPDATE
    ON whylabs.adhoc_async_requests FOR EACH ROW EXECUTE PROCEDURE
    update_async_request_timestamp();

CREATE OR REPLACE FUNCTION insert_async_request_timestamp()
    RETURNS TRIGGER AS $$
BEGIN
    NEW.created_timestamp = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE TRIGGER insert_async_request_timestamp_trigger BEFORE INSERT
    ON whylabs.adhoc_async_requests FOR EACH ROW EXECUTE PROCEDURE
    insert_async_request_timestamp();

-- Add a new status for writing
alter type adhoc_async_status_enum ADD VALUE 'WRITING_RESULTS';

-- Store a list of columns that get analyzed
alter table whylabs.adhoc_async_requests add column columns varchar[];

-- Create a queue for adhoc promotions
CREATE TABLE IF NOT EXISTS whylabs.adhoc_async_promotion_queue (
                                                            id serial PRIMARY KEY,
                                                            run_id varchar NOT NULL,
                                                            column_name varchar NOT NULL
);

CREATE INDEX IF NOT EXISTS adhoc_async_analysis_queue_run_id_idx ON whylabs.adhoc_async_analysis_queue(run_id);


