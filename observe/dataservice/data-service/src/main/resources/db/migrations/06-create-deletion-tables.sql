CREATE TYPE deletion_status_enum AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'CANCELED');

CREATE TABLE IF NOT EXISTS whylabs.profile_deletions (
                                                         id serial PRIMARY KEY,
                                                         org_id varchar NOT NULL,
                                                         dataset_id varchar NOT NULL,
                                                         delete_gte timestamptz,
                                                         delete_lt timestamptz,
                                                         before_upload_ts timestamptz,
                                                         rows_affected integer,
                                                         creation_timestamp timestamptz NOT NULL,
                                                         updated_timestamp timestamptz NOT NULL,
                                                         status deletion_status_enum
);

CREATE TABLE IF NOT EXISTS whylabs.analyzer_result_deletions (
                                                                 id serial PRIMARY KEY,
                                                                 org_id varchar NOT NULL,
                                                                 dataset_id varchar NOT NULL,
                                                                 delete_gte timestamptz,
                                                                 delete_lt timestamptz,
                                                                 rows_affected integer,
                                                                 creation_timestamp timestamptz NOT NULL,
                                                                 updated_timestamp timestamptz NOT NULL,
                                                                 status deletion_status_enum
);