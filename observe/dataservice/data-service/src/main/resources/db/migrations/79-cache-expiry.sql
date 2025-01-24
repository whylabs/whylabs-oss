alter table whylabs.cache drop column if exists id;

ALTER TABLE whylabs.cache DROP CONSTRAINT cache_cache_key_key ;

drop index if exists whylabs.cache_cache_key_key;

CREATE INDEX IF NOT EXISTS cache_idx ON whylabs.cache USING gin (cache_key);

SELECT create_hypertable('whylabs.cache','updated_ts', chunk_time_interval => interval '1 minute', create_default_indexes => FALSE, migrate_data=> TRUE, if_not_exists => TRUE);

-- Dump the cache periodically
SELECT add_retention_policy('whylabs.cache', INTERVAL '1 minutes', if_not_exists => TRUE);
