-- Development query to Refresh audit logs, based on the raw entries table. Production should look similar to this.
-- This file is merely here for reference, as it's directly defined on the BigQuery console.
MERGE INTO
development_logging.audit_log T
USING
    (
        SELECT
            publish_time,
            message_id,
            JSON_EXTRACT_SCALAR(PARSE_JSON(SAFE_CONVERT_BYTES_TO_STRING(DATA)), '$.callerIdentity.accountId') AS account_id,
            JSON_EXTRACT_SCALAR(PARSE_JSON(SAFE_CONVERT_BYTES_TO_STRING(DATA)), '$.callerIdentity.principalId') AS principal_id,
            JSON_EXTRACT_SCALAR(PARSE_JSON(SAFE_CONVERT_BYTES_TO_STRING(DATA)), '$.callerIdentity.identityId') AS identity_id,
            JSON_EXTRACT_SCALAR(PARSE_JSON(SAFE_CONVERT_BYTES_TO_STRING(DATA)), '$.eventName') AS event_name,
            JSON_EXTRACT_SCALAR(PARSE_JSON(SAFE_CONVERT_BYTES_TO_STRING(DATA)), '$.statusCode') AS status_code,
            PARSE_JSON(SAFE_CONVERT_BYTES_TO_STRING(DATA)) AS content
        FROM
            `development-whylabs.development_logging.raw_entries`
        WHERE
                subscription_name='projects/505101794958/subscriptions/write-to-bq'
          AND publish_time>=TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 2 HOUR) ) S
ON
            T.message_id=S.message_id
        AND T.publish_time=S.publish_time
WHEN NOT MATCHED
    AND DATE(publish_time)>=DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY) THEN
INSERT
(publish_time,
message_id,
account_id,
principal_id,
identity_id,
event_name,
status_code,
content)
VALUES
(publish_time, message_id, account_id, principal_id, identity_id, event_name, status_code, content);
