-- This SQL query is merely here for reference, as it's directly defined on the BigQuery console.

CREATE TABLE development_logging.audit_logs (
     publish_time TIMESTAMP NULL,
     message_id STRING NULL,
     content JSON NULL,
     account_id STRING NULL,
     principal_id STRING NULL,
     event_name STRING NULL,
     status_code STRING NULL,
     identity_id STRING NULL
);
