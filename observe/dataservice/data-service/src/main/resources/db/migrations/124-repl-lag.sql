/**
  This timestamp will get updated on the PG primary and trickle down to each replica. The amount of time
  difference between now and the row in this table helps to measure the replication lag.
 */

CREATE TABLE IF NOT EXISTS whylabs.repl_lag(
                    last_updated_timestamp timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL
);

insert into whylabs.repl_lag (last_updated_timestamp) values (now());