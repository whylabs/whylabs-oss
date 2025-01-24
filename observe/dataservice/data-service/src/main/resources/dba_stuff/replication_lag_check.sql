SELECT
    pg_is_in_recovery() AS is_slave,
    pg_last_wal_receive_lsn() AS receive,
    pg_last_wal_replay_lsn() AS replay,
    pg_last_wal_receive_lsn() = pg_last_wal_replay_lsn() AS synced,
    EXTRACT(SECONDS FROM now() - pg_last_xact_replay_timestamp())::float AS lag;