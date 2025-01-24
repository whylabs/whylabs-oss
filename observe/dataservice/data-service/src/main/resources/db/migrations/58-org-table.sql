CREATE TABLE if not exists whylabs.orgs (
                                                     id                             bigserial PRIMARY KEY,
                                                     org_id                         text,
                                                     data_retention_days            integer,
                                                     enable_granular_data_storage   boolean,
                                                     unique (org_id)
);

COMMENT ON COLUMN whylabs.orgs.enable_granular_data_storage IS 'Store all profiles in an unmerged fashion in an additional table';