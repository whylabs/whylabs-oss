# Notifications Service

## Table of Contents

- [Environment Variables](#environment-variables)
- [SQS Queues](#sqs-queues)
  - [Siren Notification Trigger Queue](#siren-notification-trigger-queue)

## Environment Variables

> :information_source: See the [Environment Configuration](../../README.md#environment-configuration)
> for required environment variables. If additional environment configuration is
> required for the resources contained in this file, they will be specified in
> this section.

```shell
SIREN_NOTIFICATION_TRIGGER_QUEUE="whylabs-siren-notification-trigger"
```

## SQS Queues

### Siren Notification Trigger Queue

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

aws sqs create-queue --queue-name "${SIREN_NOTIFICATION_TRIGGER_QUEUE}" --attributes '{
    "VisibilityTimeout": "60",
    "MaximumMessageSize": "262144",
    "MessageRetentionPeriod": "345600",
    "DelaySeconds": "0",
    "Policy": "${SN_QUEUE_POLICY}",
    "ReceiveMessageWaitTimeSeconds": "10",
    "KmsMasterKeyId": "alias/aws/sqs",
    "KmsDataKeyReusePeriodSeconds": "300",
    "SqsManagedSseEnabled": "false",
    "FifoQueue": "true",
    "DeduplicationScope": "queue",
    "FifoThroughputLimit": "perQueue",
    "ContentBasedDeduplication": "true"
  }'
```
