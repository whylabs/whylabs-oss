
DO $$ BEGIN
    alter type adhoc_async_status_enum rename value 'FAILEDCANCELED' to 'FAILED';
    alter type adhoc_async_status_enum add value 'CANCELED';
EXCEPTION
    WHEN others THEN null;
END $$;