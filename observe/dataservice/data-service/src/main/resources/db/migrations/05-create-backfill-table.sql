CREATE TYPE backfill_status AS ENUM ('pending', 'canceled', 'in_progress', 'completed');

CREATE TABLE IF NOT EXISTS whylabs.backfill_requests (
                                                         id serial PRIMARY KEY,
                                                         org_id varchar NOT NULL,
                                                         dataset_id varchar NOT NULL,
                                                         overwrite boolean,
                                                         analyzer_ids text[],
                                                         creation_timestamp timestamptz NOT NULL,
                                                         updated_timestamp timestamptz NOT NULL,
                                                         gte timestamptz NOT NULL,
                                                         lt timestamptz NOT NULL,
                                                         status backfill_status,
                                                         requested_by varchar,
                                                         cancelation_requested boolean NOT NULL
);


