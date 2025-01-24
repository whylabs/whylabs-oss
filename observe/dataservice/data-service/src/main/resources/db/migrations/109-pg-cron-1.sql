-- Keep the cron job_run_details table tidy
SELECT cron.schedule('0 0 * * *', $$DELETE
    FROM cron.job_run_details
    WHERE end_time < now() - interval '4 hours'$$);
