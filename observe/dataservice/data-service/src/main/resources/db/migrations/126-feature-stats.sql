

--truncate whylabs.column_stats;

--drop table whylabs.column_stats;
CREATE TABLE IF NOT EXISTS whylabs.column_stats (
                                                                    org_id text NOT NULL,
                                                                    dataset_id text NOT NULL,
                                                                    column_name text,
                                                                    dataset_timestamp timestamptz NOT NULL,
                                                                    earliest_ingest_timestamp timestamptz NOT NULL,
                                                                    segment_text jsonb,
                                                                    token uuid not null

);

-- Token makes it easy to grab all new rows inserted from a batch w/o a bunch of PK lookups
create index column_stats_token_idx
    on whylabs.column_stats using gin (token);

-- Auto-dedupe on this table. Can't rely on a unique constraint because there's no jsonb support
Create or replace Function ignore_column_stat_dups() Returns Trigger
As $$
Begin
    If Exists (
        Select
            1
        From
            whylabs.column_stats h
        Where
          -- Assuming all three fields are primary key
            h.org_id = NEW.org_id
          And h.dataset_id = NEW.dataset_id
          And h.dataset_timestamp = NEW.dataset_timestamp
        And h.column_name = NEW.column_name
         --TODO: Is matcher correct
          And (segment_text @> NEW.segment_text)
    ) Then
        Return NULL;
    End If;
    Return NEW;
End;
$$ Language plpgsql;

Create Trigger ignore_dups
    Before Insert On whylabs.column_stats
    For Each Row
Execute Procedure ignore_column_stat_dups();

-- Write during data promotion. This can be used for:
--  * detecting whether a feature newly appeared
--  * infer integration patterns
--  * fetch active columns for a timestamp

SELECT create_hypertable('whylabs.column_stats','dataset_timestamp', chunk_time_interval => interval '7 day', create_default_indexes => FALSE);

create index feature_stats_idx
    on whylabs.column_stats using gin (org_id, dataset_id, segment_text jsonb_path_ops, column_name);

--drop table whylabs.columns_new_arrival_queue;

-- Newly arrived features get queued up so the scheduler can check if any of them warrant a backfill
CREATE TABLE IF NOT EXISTS whylabs.columns_new_arrival_queue (
                                                    id serial PRIMARY KEY,
                                                     org_id text NOT NULL,
                                                     dataset_id text NOT NULL,
                                                     column_names text[],
                                                     dataset_timestamp timestamptz NOT NULL,
                                                     earliest_ingest_timestamp timestamptz NOT NULL,
                                                     queued timestamptz NOT NULL,
                                                     segment_text jsonb
);

alter table whylabs.pg_monitor_late_data_queue add column columns text[];

alter table whylabs.adhoc_async_requests add column segment_list jsonb;
alter table whylabs.adhoc_async_requests add column include_overall_segment boolean default true;

create or replace function array_unique (a text[]) returns text[] as $$
select array (
               select distinct v from unnest(a) as b(v)
       )
$$ language sql;

