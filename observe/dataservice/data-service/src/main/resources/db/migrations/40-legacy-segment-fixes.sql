CREATE OR REPLACE FUNCTION bulk_proxy_legacy_segments_hypertable_insert() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    if NEW.dataset_id is null or NEW.dataset_id = '' then
        RETURN null;
    end if;

    if NEW.latest_upload_timestamp is null or NEW.latest_upload_timestamp = '' or NEW.latest_upload_timestamp = 'null' then
        insert into whylabs.legacy_segments (org_id, dataset_id, segment_text, latest_dataset_timestamp, oldest_dataset_timestamp)
        select
            NULLIF(NULLIF(NEW.org_id, ''), 'null')::varchar,
            NULLIF(NULLIF(NEW.dataset_id, ''), 'null')::varchar,
            array_to_json(string_to_array(NEW.segment_text, ','))::jsonb,
            NEW.latest_dataset_timestamp::timestamptz,
            NEW.oldest_dataset_timestamp::timestamptz
        ON CONFLICT (org_id, dataset_id, segment_text) DO UPDATE set
                                                                     latest_dataset_timestamp = greatest(legacy_segments.latest_dataset_timestamp, excluded.latest_dataset_timestamp::timestamptz),
                                                                     oldest_dataset_timestamp = least(legacy_segments.oldest_dataset_timestamp, excluded.oldest_dataset_timestamp::timestamptz);
        RETURN null;
    else
        insert into whylabs.legacy_segments (org_id, dataset_id, segment_text, latest_dataset_timestamp, oldest_dataset_timestamp, latest_upload_timestamp, oldest_upload_timestamp)
        select
            NULLIF(NULLIF(NEW.org_id, ''), 'null')::varchar,
            NULLIF(NULLIF(NEW.dataset_id, ''), 'null')::varchar,
            array_to_json(string_to_array(NEW.segment_text, ','))::jsonb,
            NEW.latest_dataset_timestamp::timestamptz,
            NEW.oldest_dataset_timestamp::timestamptz,
            NEW.latest_upload_timestamp::timestamptz,
            NEW.oldest_upload_timestamp::timestamptz
        ON CONFLICT (org_id, dataset_id, segment_text) DO UPDATE set
                                                                     latest_dataset_timestamp = greatest(legacy_segments.latest_dataset_timestamp, excluded.latest_dataset_timestamp::timestamptz),
                                                                     oldest_dataset_timestamp = least(legacy_segments.oldest_dataset_timestamp, excluded.oldest_dataset_timestamp::timestamptz),
                                                                     latest_upload_timestamp = greatest(legacy_segments.latest_upload_timestamp, excluded.latest_upload_timestamp::timestamptz),
                                                                     oldest_upload_timestamp = least(legacy_segments.oldest_upload_timestamp, excluded.oldest_upload_timestamp::timestamptz);
        RETURN null;
    end if;
END $$;