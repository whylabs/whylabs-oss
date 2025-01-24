CREATE TABLE IF NOT EXISTS whylabs.datasets (
                                                            id serial primary key,
                                                            org_id bigint NOT NULL references whylabs.orgs(id),
                                                            dataset_id varchar NOT NULL,
                                                            granularity varchar,
                                                            ingestion_disabled boolean default false,
                                                            unique (org_id, dataset_id)
);
