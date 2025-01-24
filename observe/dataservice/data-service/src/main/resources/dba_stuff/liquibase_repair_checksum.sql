-- If you make any change at all, even adding a comment to a liquibase file, it changes the hash and you'll
-- get something like this in the logs, failing to roll out.

-- 	liquibase.exception.ValidationFailedException: Validation Failed:
--      1 changesets check sum
--           db/migrations/31-staging-table-dead-tuple-maintenance.sql::raw::includeAll was: 8:acef941a5a1b8af1a3088a5807f9aab6 but is now: 8:f3db8a4b071c78f5e6496212c0e35f6e
--
-- You can remedy that by updating the hash in the database

UPDATE public.databasechangelog SET md5sum = '8:acef941a5a1b8af1a3088a5807f9aab6' WHERE filename='db/migrations/31-staging-table-dead-tuple-maintenance.sql'
