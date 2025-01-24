# Data Service

## Table of Contents

- [Environment Variables](#environment-variables)
- [S3 Buckets](#s3-buckets)
- [SQS Queue](#sqs-queue)
- [Kinesis Streams](#kinesis-streams)

## Environment Variables

> :information_source: See the [Environment Configuration](../../README.md#environment-configuration)
> for required environment variables. If additional environment configuration is
> required for the resources contained in this file, they will be specified in
> this section.

```shell
DATASERVICE_ARTIFACT_BUCKET="whylabs-dataservice-artifacts"
CLOUD_TRAIL_BUCKET="whylabs-dataservice-cloud-trail"

SIREN_NOTIFICATION_TOPIC_QUEUE="whylabs-dataservice-monitor-notifications"

KINESIS_INGESTION_STATUS_STREAM="whylabs-dataservice-ingestion-status"
KINESIS_BULK_INGESTION_TRIGGER_STREAM="whylabs-dataservice-bulk-ingestion-trigger"
KINESIS_PROFILE_UPLOAD_STREAM="whylabs-dataservice-profile-upload"
```

## S3 Bucket

```shell
aws s3api create-bucket \
  --bucket "${DATASERVICE_ARTIFACT_BUCKET}" \
  --create-bucket-configuration LocationConstraint="${AWS_REGION}" \
  --query "Location" \
  --output text

aws s3api create-bucket \
  --bucket "${CLOUD_TRAIL_BUCKET}" \
  --create-bucket-configuration LocationConstraint="${AWS_REGION}" \
  --query "Location" \
  --output text
```

## SQS Queue

```shell
SN_QUEUE_POLICY=$(cat <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "events.amazonaws.com"
      },
      "Action": "sqs:SendMessage",
      "Resource": "*"
    }
  ]
}
EOF
)

aws sqs create-queue --queue-name "${SIREN_NOTIFICATION_TOPIC_QUEUE}" --attributes '{
    "VisibilityTimeout": "7200",
    "MaximumMessageSize": "262144",
    "MessageRetentionPeriod": "86400",
    "DelaySeconds": "0",
    "ReceiveMessageWaitTimeSeconds": "20",
    "SqsManagedSseEnabled": "false"
  }'
```

## Kinesis Streams

### Environment Configuration

```shell
KINESIS_INGESTION_STATUS_STREAM="whylabs-${ENTITY}-ingestion-status"
KINESIS_BULK_INGESTION_TRIGGER_STREAM="whylabs-${ENTITY}-bulk-ingestion-trigger"
KINESIS_PROFILE_UPLOAD_STREAM="whylabs-${ENTITY}-profile-upload"
```

### Ingestion Status Stream

```shell
INGESTION_STATUS_CONFIG=$(cat <<EOF
{
  "StreamName": "${KINESIS_INGESTION_STATUS_STREAM}",
  "ShardCount": 4
}
EOF
)

INGESTION_STATUS_STREAM_MODE=$(cat <<EOF
{
  "StreamMode": "ON_DEMAND"
}
EOF
)

aws kinesis create-stream \
  --cli-input-json "${INGESTION_STATUS_CONFIG}" \
  --stream-mode-details "${INGESTION_STATUS_STREAM_MODE}"

aws kinesis enable-enhanced-monitoring \
  --stream-name "${KINESIS_INGESTION_STATUS_STREAM}" \
  --shard-level-metrics "IncomingBytes" "IncomingRecords" "OutgoingBytes"
```

### Bulk Ingestion Trigger Stream

```shell
BULK_INGESTION_TRIGGER_CONFIG=$(cat <<EOF
{
  "StreamName": "${KINESIS_BULK_INGESTION_TRIGGER_STREAM}",
  "ShardCount": 1
}
EOF

BULK_INGESTION_TRIGGER_STREAM_MODE=$(cat <<EOF
{
  "StreamMode": "ON_DEMAND"
}
EOF
)

aws kinesis create-stream \
  --cli-input-json "${BULK_INGESTION_TRIGGER_CONFIG}" \
  --stream-mode-details "${BULK_INGESTION_TRIGGER_STREAM_MODE}"

aws kinesis enable-enhanced-monitoring \
  --stream-name "${KINESIS_BULK_INGESTION_TRIGGER_STREAM}" \
  --shard-level-metrics "IncomingBytes" "OutgoingBytes"
```

### Profile Upload Stream

```shell
aws kinesis describe-stream --stream-name development-ProfileUploadNotifications-d0fc597

PROFILE_UPLOAD_STREAM_CONFIG=$(cat <<EOF
{
  "StreamName": "${KINESIS_PROFILE_UPLOAD_STREAM}",
  "ShardCount": 1
}
EOF

PROFILE_UPLOAD_STREAM_MODE=$(cat <<EOF
{q
  "StreamMode": "ON_DEMAND"
}
EOF
)

aws kinesis create-stream \
  --cli-input-json "${PROFILE_UPLOAD_STREAM_CONFIG}" \
  --stream-mode-details "${PROFILE_UPLOAD_STREAM_MODE}"

aws kinesis enable-enhanced-monitoring \
  --stream-name "${KINESIS_PROFILE_UPLOAD_STREAM}" \
  --shard-level-metrics "IncomingBytes" "OutgoingBytes"
```
