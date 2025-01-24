

-- Its too slow to query the audit table because PG wants to do an index scan and the indexes have gotten
-- too big to query without an org/dataset id scoping the index scan. What we have here is a dedicated
-- hypertable with a really short TTL thats cheap to table scan. A timescaledb scheduled rollup view
-- makes it dirt cheap to count how many profiles have been uploaded in the last couple hours.

CREATE TABLE IF NOT EXISTS whylabs.dataset_statistics (
                                                             org_id varchar NOT NULL,
                                                             dataset_id varchar NOT NULL,
                                                             ingest_timestamp timestamptz
);

SELECT create_hypertable('whylabs.dataset_statistics','ingest_timestamp', chunk_time_interval => interval '1 minute', create_default_indexes => FALSE);
SELECT add_retention_policy('whylabs.dataset_statistics', INTERVAL '2 hours');

CREATE OR REPLACE FUNCTION write_dataset_statistic() RETURNS TRIGGER AS
$BODY$
BEGIN
    INSERT INTO
        whylabs.dataset_statistics(org_id, dataset_id, ingest_timestamp)
    VALUES(new.org_id, new.dataset_id, coalesce(new.ingest_timestamp, now()));

    RETURN new;
END;
$BODY$
    language plpgsql;

CREATE OR REPLACE TRIGGER write_dataset_statistic
    AFTER INSERT ON whylabs.profile_upload_audit
    FOR EACH ROW
EXECUTE FUNCTION write_dataset_statistic();

CREATE MATERIALIZED VIEW whylabs.dataset_statistics_rollup WITH (timescaledb.continuous) AS
SELECT time_bucket(INTERVAL '1 hours', ingest_timestamp) AS bucket, org_id, dataset_id, count(*) as profile_uploads
FROM whylabs.dataset_statistics
GROUP BY org_id, dataset_id, bucket WITH NO DATA;

-- Refresh pretty aggressively
SELECT add_continuous_aggregate_policy('whylabs.dataset_statistics_rollup',
                                       start_offset => INTERVAL '1 month',
                                       end_offset => null,
                                       schedule_interval => INTERVAL '5 m');


CREATE INDEX IF NOT EXISTS dataset_statistics_rollup_idx ON whylabs.dataset_statistics_rollup(org_id, dataset_id);