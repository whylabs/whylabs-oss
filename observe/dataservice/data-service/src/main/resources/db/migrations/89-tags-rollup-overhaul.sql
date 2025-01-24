-- Story time: We used to update the tags table on every profile insert. That resulted in bursts of
-- row lock contention on the tags table and even causing some deadlocks. I tried making the updates
-- less frequent but that hurt accuracy. The new structure is to have a staging table that's insert only
-- and a process to delete & roll up records on a periodic basis. That keeps the ingestion flow lock free
-- while ensuring eventually consistent data.

create table whylabs.tags_staging
(
    org_id                   varchar                                                  not null,
    dataset_id               varchar                                                  not null,
    tag_key                  varchar,
    tag_value                varchar,
    latest_dataset_timestamp timestamp with time zone,
    oldest_dataset_timestamp timestamp with time zone,
    latest_upload_timestamp  timestamp with time zone,
    oldest_upload_timestamp  timestamp with time zone

)  ;

