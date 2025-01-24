drop table if exists whylabs.cache;

CREATE TABLE IF NOT EXISTS whylabs.cache (
                                                            id serial PRIMARY KEY,
                                                            org_id text not null,
                                                            dataset_id text not null,
                                                            endpoint text  NOT NULL,
                                                            cache_key text not null ,
                                                            updated_ts timestamptz NOT NULL,
                                                            content text, unique (cache_key)
) ;

--explain analyze select * from whylabs.cache where  cache_key = 'f55ec229-0385-3c37-97d6-cb0977f79085';

-- Make it fast to check for most recent deletion
create index if not exists deletions_idx
    on whylabs.profile_deletions (org_id, dataset_id) include (updated_timestamp);
