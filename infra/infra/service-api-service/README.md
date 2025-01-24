# API Service Infrasturucture

## Table of Contents

- [Environment Variables](#environment-variables)
- [S3 Bucket](#s3-bucket)
- [DynamoDB Tables](#dynamodb-tables)
  - [API Key Table](#api-key-table)
  - [Data Table](#data-table)
  - [Global Actions Table](#global-actions-table)
  - [Metadata Table](#metadata-table)
- [SQS Queues](#sqs-queues)
  - [Monitor Config Queue](#monitor-config-queue)
  - [Test Notification Queue](#test-notification-queue)
  - [User Membership Notifications Queue](#user-membership-notifications-queue)
  - [Siren Notification Trigger Queue](#siren-notification-trigger-queue)

## Environment Variables

> :information_source: See the [Environment Configuration](../../README.md#environment-configuration)
> for required environment variables. If additional environment configuration is
> required for the resources contained in this file, they will be specified in
> this section.

```shell
# S3 Bucket
SONGBIRD_BUCKET="whylabs-songbird-bucket"

# DynamoDB Tables
SONGBIRD_APK_KEY_TABLE="whylabs-songbird-api-key"
SONGBIRD_DATA_TABLE="whylabs-songbird-data"
SONGBIRD_GLOBAL_ACTIONS_TABLE="whylabs-songbird-global-actions"
SONGBIRD_METADATA_TABLE="whylabs-songbird-metadata"

# SQS Queue Names
SONGBIRD_MONITOR_CONFIG_QUEUE="whylabs-songbird-monitor-config"
SONGBIRD_MONITOR_CONFIG_DLQ_QUEUE="whylabs-songbird-monitor-config-dlq"
SONGBIRD_TEST_NOTIFICATION_QUEUE="whylabs-songbird-test-notification"
SONGBIRD_TEST_NOTIFICATION_DLQ_QUEUE="whylabs-songbird-test-notification-dlq"
SONGBIRD_USER_MEMBERSHIP_NOTIFICATIONS_QUEUE="whylabs-songbird-user-membership-notifications"
SONGBIRD_USER_MEMBERSHIP_NOTIFICATIONS_DLQ_QUEUE="whylabs-songbird-user-membership-notifications-dlq"
```

## S3 Bucket

```shell
aws s3api create-bucket \
  --bucket "${SONGBIRD_BUCKET}" \
  --create-bucket-configuration LocationConstraint="${AWS_REGION}" \
  --query "Location" \
  --output text
```

## DynamoDB Tables

### API Key Table

```shell
SONGBIRD_API_KEY_TABLE_CONFIG=$(cat <<EOF
{
  "TableName": "${SONGBIRD_APK_KEY_TABLE}",
  "AttributeDefinitions": [
    {
      "AttributeName": "key_hash",
      "AttributeType": "S"
    },
    {
      "AttributeName": "key_id",
      "AttributeType": "S"
    },
    {
      "AttributeName": "org_id",
      "AttributeType": "S"
    },
    {
      "AttributeName": "user_id",
      "AttributeType": "S"
    }
  ],
  "KeySchema": [
    {
      "AttributeName": "key_hash",
      "KeyType": "HASH"
    }
  ],
  "BillingMode": "PAY_PER_REQUEST",
  "GlobalSecondaryIndexes": [
    {
      "IndexName": "org-index",
      "KeySchema": [
        {
          "AttributeName": "org_id",
          "KeyType": "HASH"
        }
      ],
      "Projection": {
        "ProjectionType": "ALL"
      }
    },
    {
      "IndexName": "keys-idx",
      "KeySchema": [
        {
          "AttributeName": "user_id",
          "KeyType": "HASH"
        },
        {
          "AttributeName": "key_id",
          "KeyType": "RANGE"
        }
      ],
      "Projection": {
        "ProjectionType": "ALL"
      }
    }
  ],
  "DeletionProtectionEnabled": false
}
EOF
)

aws dynamodb create-table \
  --cli-input-json "${SONGBIRD_API_KEY_TABLE_CONFIG}"
```

### Data Table

```shell
SONGBIRD_DATA_TABLE_CONFIG=$(cat <<EOF
{
  "TableName": "${SONGBIRD_DATA_TABLE}",
  "AttributeDefinitions": [
    {
      "AttributeName": "alerts_dataset_timestamp",
      "AttributeType": "S"
    },
    {
      "AttributeName": "dataset_timestamp",
      "AttributeType": "S"
    },
    {
      "AttributeName": "events_dataset_timestamp",
      "AttributeType": "S"
    },
    {
      "AttributeName": "log_staging_group",
      "AttributeType": "S"
    },
    {
      "AttributeName": "pk",
      "AttributeType": "S"
    },
    {
      "AttributeName": "reference_dataset",
      "AttributeType": "S"
    },
    {
      "AttributeName": "reference_timestamp",
      "AttributeType": "S"
    },
    {
      "AttributeName": "segment_model",
      "AttributeType": "S"
    },
    {
      "AttributeName": "sk",
      "AttributeType": "S"
    },
    {
      "AttributeName": "summarized_model",
      "AttributeType": "S"
    },
    {
      "AttributeName": "summary_timestamp",
      "AttributeType": "S"
    },
    {
      "AttributeName": "upload_timestamp",
      "AttributeType": "S"
    }
  ],
  "KeySchema": [
    {
      "AttributeName": "pk",
      "KeyType": "HASH"
    },
    {
      "AttributeName": "sk",
      "KeyType": "RANGE"
    }
  ],
  "BillingMode": "PAY_PER_REQUEST",
  "GlobalSecondaryIndexes": [
    {
      "IndexName": "dataset_profiles-index",
      "KeySchema": [
        {
          "AttributeName": "segment_model",
          "KeyType": "HASH"
        },
        {
          "AttributeName": "dataset_timestamp",
          "KeyType": "RANGE"
        }
      ],
      "Projection": {
        "ProjectionType": "ALL"
      }
    },
    {
      "IndexName": "events-index",
      "KeySchema": [
        {
          "AttributeName": "segment_model",
          "KeyType": "HASH"
        },
        {
          "AttributeName": "events_dataset_timestamp",
          "KeyType": "RANGE"
        }
      ],
      "Projection": {
        "ProjectionType": "ALL"
      }
    },
    {
      "IndexName": "alerts-index",
      "KeySchema": [
        {
          "AttributeName": "segment_model",
          "KeyType": "HASH"
        },
        {
          "AttributeName": "alerts_dataset_timestamp",
          "KeyType": "RANGE"
        }
      ],
      "Projection": {
        "ProjectionType": "ALL"
      }
    },
    {
      "IndexName": "reference_profiles-index",
      "KeySchema": [
        {
          "AttributeName": "reference_dataset",
          "KeyType": "HASH"
        },
        {
          "AttributeName": "reference_timestamp",
          "KeyType": "RANGE"
        }
      ],
      "Projection": {
        "ProjectionType": "ALL"
      }
    },
    {
        "IndexName": "reference_profiles_upload-index",
        "KeySchema": [
          {
            "AttributeName": "reference_dataset",
            "KeyType": "HASH"
          },
          {
            "AttributeName": "upload_timestamp",
            "KeyType": "RANGE"
          }
        ],
        "Projection": {
          "ProjectionType": "ALL"
        },
    },
    {
      "IndexName": "log_entries-index",
      "KeySchema": [
        {
          "AttributeName": "log_staging_group",
          "KeyType": "HASH"
        }
      ],
      "Projection": {
        "ProjectionType": "ALL"
      }
    },
    {
      "IndexName": "summarized_dataset_profiles-index",
      "KeySchema": [
        {
          "AttributeName": "summarized_model",
          "KeyType": "HASH"
        },
        {
          "AttributeName": "summary_timestamp",
          "KeyType": "RANGE"
        }
      ],
      "Projection": {
        "ProjectionType": "ALL"
      }
    }
  ],
  "DeletionProtectionEnabled": false
}
EOF
)

aws dynamodb create-table \
  --cli-input-json "${SONGBIRD_DATA_TABLE_CONFIG}
```

### Global Actions Table

```shell
SONGBIRD_GLOBAL_ACTIONS_TABLE_CONFIG=$(cat <<EOF
{
  "TableName": "${SONGBIRD_GLOBAL_ACTIONS_TABLE}",
  "AttributeDefinitions": [
    {
      "AttributeName": "id",
      "AttributeType": "S"
    },
    {
      "AttributeName": "org_id",
      "AttributeType": "S"
    }
  ],
  "KeySchema": [
    {
      "AttributeName": "id",
      "KeyType": "HASH"
    },
    {
      "AttributeName": "org_id",
      "KeyType": "RANGE"
    }
  ],
  "BillingMode": "PAY_PER_REQUEST",
  "GlobalSecondaryIndexes": [
    {
      "IndexName": "org-index",
      "KeySchema": [
        {
          "AttributeName": "org_id",
          "KeyType": "HASH"
        }
      ],
      "Projection": {
        "ProjectionType": "ALL"
      }
    }
  ],
  "DeletionProtectionEnabled": false
}
EOF
)

aws dynamodb create-table \
  --cli-input-json "${SONGBIRD_GLOBAL_ACTIONS_TABLE_CONFIG}"
```

### Metadata Table

```shell
SONGBIRD_METADATA_TABLE_CONFIG=$(cat <<EOF
{
  "TableName": "${SONGBIRD_METADATA_TABLE}",
  "AttributeDefinitions": [
    {
      "AttributeName": "asset_version",
      "AttributeType": "N"
    },
    {
      "AttributeName": "claim_membership",
      "AttributeType": "S"
    },
    {
      "AttributeName": "claim_org_membership",
      "AttributeType": "S"
    },
    {
      "AttributeName": "creation_time",
      "AttributeType": "S"
    },
    {
      "AttributeName": "email",
      "AttributeType": "S"
    },
    {
      "AttributeName": "membership",
      "AttributeType": "S"
    },
    {
      "AttributeName": "model_id",
      "AttributeType": "S"
    },
    {
      "AttributeName": "org_asset_id",
      "AttributeType": "S"
    },
    {
      "AttributeName": "org_id",
      "AttributeType": "S"
    },
    {
      "AttributeName": "org_membership",
      "AttributeType": "S"
    },
    {
      "AttributeName": "parent_org_id",
      "AttributeType": "S"
    },
    {
      "AttributeName": "pk",
      "AttributeType": "S"
    },
    {
      "AttributeName": "segment_model",
      "AttributeType": "S"
    },
    {
      "AttributeName": "segment_value",
      "AttributeType": "S"
    },
    {
      "AttributeName": "sk",
      "AttributeType": "S"
    },
    {
      "AttributeName": "subscription_id",
      "AttributeType": "S"
    }
  ],
  "KeySchema": [
    {
      "AttributeName": "pk",
      "KeyType": "HASH"
    },
    {
      "AttributeName": "sk",
      "KeyType": "RANGE"
    }
  ],
  "BillingMode": "PAY_PER_REQUEST",
  "GlobalSecondaryIndexes": [
    {
      "IndexName": "models-index",
      "KeySchema": [
        {
          "AttributeName": "org_id",
          "KeyType": "HASH"
        },
        {
          "AttributeName": "model_id",
          "KeyType": "RANGE"
        }
      ],
      "Projection": {
        "ProjectionType": "ALL"
      }
    },
    {
      "IndexName": "claim-org-member-index",
      "KeySchema": [
        {
          "AttributeName": "claim_org_membership",
          "KeyType": "HASH"
        }
      ],
      "Projection": {
        "ProjectionType": "ALL"
      }
    },
    {
      "IndexName": "claim-member-index",
      "KeySchema": [
        {
          "AttributeName": "claim_membership",
          "KeyType": "HASH"
        }
      ],
      "Projection": {
        "ProjectionType": "ALL"
      }
    },
    {
      "IndexName": "parent-org-index",
      "KeySchema": [
        {
          "AttributeName": "parent_org_id",
          "KeyType": "HASH"
        }
      ],
      "Projection": {
        "ProjectionType": "ALL"
      }
    },
    {
      "IndexName": "member-index",
      "KeySchema": [
        {
          "AttributeName": "membership",
          "KeyType": "HASH"
        }
      ],
      "Projection": {
        "ProjectionType": "ALL"
      }
    },
    {
      "IndexName": "org-member-index",
      "KeySchema": [
        {
          "AttributeName": "org_membership",
          "KeyType": "HASH"
        }
      ],
      "Projection": {
        "ProjectionType": "ALL"
      }
    },
    {
      "IndexName": "orgs-index",
      "KeySchema": [
        {
          "AttributeName": "sk",
          "KeyType": "HASH"
        },
        {
          "AttributeName": "org_id",
          "KeyType": "RANGE"
        }
      ],
      "Projection": {
        "ProjectionType": "ALL"
      }
    },
    {
      "IndexName": "sessions-index",
      "KeySchema": [
        {
          "AttributeName": "sk",
          "KeyType": "HASH"
        },
        {
          "AttributeName": "creation_time",
          "KeyType": "RANGE"
        }
      ],
      "Projection": {
        "ProjectionType": "ALL"
      }
    },
    {
      "IndexName": "org_asset_id-asset_version-index",
      "KeySchema": [
        {
          "AttributeName": "org_asset_id",
          "KeyType": "HASH"
        },
        {
          "AttributeName": "asset_version",
          "KeyType": "RANGE"
        }
      ],
      "Projection": {
        "ProjectionType": "ALL"
      }
    },
    {
      "IndexName": "subscription-index",
      "KeySchema": [
        {
          "AttributeName": "subscription_id",
          "KeyType": "HASH"
        }
      ],
      "Projection": {
        "ProjectionType": "ALL"
      }
    },
    {
      "IndexName": "segments-index",
      "KeySchema": [
        {
          "AttributeName": "segment_model",
          "KeyType": "HASH"
        },
        {
          "AttributeName": "segment_value",
          "KeyType": "RANGE"
        }
      ],
      "Projection": {
        "ProjectionType": "ALL"
      }
    },
    {
      "IndexName": "email-index",
      "KeySchema": [
        {
          "AttributeName": "email",
          "KeyType": "HASH"
        }
      ],
      "Projection": {
        "ProjectionType": "ALL"
      }
    }
  ],
  "DeletionProtectionEnabled": false
}
EOF
)

aws dynamodb create-table \
  --cli-input-json "${SONGBIRD_METADATA_TABLE_CONFIG}"
```

## SQS Queues

### Monitor Config Queue

```shell
aws sqs create-queue --queue-name "${SONGBIRD_MONITOR_CONFIG_DLQ_QUEUE}" --attributes '{
    "VisibilityTimeout": "60",
    "MaximumMessageSize": "262144",
    "MessageRetentionPeriod": "345600",
    "DelaySeconds": "0",
    "ReceiveMessageWaitTimeSeconds": "10",
    "KmsMasterKeyId": "alias/aws/sqs",
    "KmsDataKeyReusePeriodSeconds": "300",
    "SqsManagedSseEnabled": "false"
  }'

aws sqs create-queue --queue-name "${SONGBIRD_MONITOR_CONFIG_QUEUE}" --attributes '{
    "VisibilityTimeout": "60",
    "MaximumMessageSize": "262144",
    "MessageRetentionPeriod": "345600",
    "DelaySeconds": "0",
    "RedrivePolicy": "{\"deadLetterTargetArn\":\"arn:aws:sqs:us-west-2:207285235248:'${SONGBIRD_MONITOR_CONFIG_DLQ_QUEUE}'\",\"maxReceiveCount\":4}",
    "ReceiveMessageWaitTimeSeconds": "10",
    "KmsMasterKeyId": "alias/aws/sqs",
    "KmsDataKeyReusePeriodSeconds": "300",
    "SqsManagedSseEnabled": "false"
  }'
```

### User Membership Notifications Queue

```shell
UM_DLQ_POLICY=$(cat <<EOF
{
  "Version": "2012-10-17",
  "Id": "SQSDefaultPolicy",
  "Statement": [
    {
      "Sid": "topic-subscription-arn:aws:sns:${AWS_REGION}:${AWS_ACCOUNT_ID}:siren-email-notification-failure",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "SQS:SendMessage",
      "Resource": "arn:aws:sqs:${AWS_REGION}:${AWS_ACCOUNT_ID}:${SONGBIRD_USER_MEMBERSHIP_NOTIFICATIONS_DLQ_QUEUE}",
      "Condition": {
        "ArnLike": {
          "aws:SourceArn": "arn:aws:sns:${AWS_REGION}:${AWS_ACCOUNT_ID}:siren-email-notification-failure"
        }
      }
    }
  ]
}
EOF
)

UM_QUEUE_POLICY=$(cat <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::${AWS_ACCOUNT_ID}:root"
      },
      "Action": "sqs:SendMessage",
      "Resource": "*"
    }
  ]
}
EOF
)

UM_REDRIVE_POLICY=$(cat <<EOF
{
  "deadLetterTargetArn": "arn:aws:sqs:${AWS_REGION}:${AWS_ACCOUNT_ID}:${SONGBIRD_USER_MEMBERSHIP_NOTIFICATIONS_DLQ_QUEUE}",
  "maxReceiveCount": 4
}
EOF
)

aws sqs create-queue --queue-name "${SONGBIRD_USER_MEMBERSHIP_NOTIFICATIONS_DLQ_QUEUE}" --attributes '{
    "VisibilityTimeout": "60",
    "MaximumMessageSize": "262144",
    "MessageRetentionPeriod": "345600",
    "DelaySeconds": "0",
    "Policy": "${UM_DLQ_POLICY}",
    "ReceiveMessageWaitTimeSeconds": "10",
    "KmsMasterKeyId": "alias/aws/sqs",
    "KmsDataKeyReusePeriodSeconds": "300",
    "SqsManagedSseEnabled": "false"
  }'

aws sqs create-queue --queue-name "${SONGBIRD_USER_MEMBERSHIP_NOTIFICATIONS_QUEUE}" --attributes '{
    "VisibilityTimeout": "60",
    "MaximumMessageSize": "262144",
    "MessageRetentionPeriod": "345600",
    "DelaySeconds": "0",
    "Policy": "${UM_QUEUE_POLICY}",
    "RedrivePolicy": "${UM_REDRIVE_POLICY}",
    "ReceiveMessageWaitTimeSeconds": "10",
    "KmsMasterKeyId": "alias/aws/sqs",
    "KmsDataKeyReusePeriodSeconds": "300",
    "SqsManagedSseEnabled": "false"
  }'
```

### Test Notification Queue

```shell
TN_REDRIVE_POLICY=$(cat <<EOF
{
  "deadLetterTargetArn": "arn:aws:sqs:${AWS_REGION}:${AWS_ACCOUNT_ID}:${SONGBIRD_TEST_NOTIFICATION_DLQ_QUEUE}",
  "maxReceiveCount": 4
}
EOF
)

aws sqs create-queue --queue-name "${SONGBIRD_TEST_NOTIFICATION_DLQ_QUEUE}" --attributes '{
    "VisibilityTimeout": "60",
    "MaximumMessageSize": "262144",
    "MessageRetentionPeriod": "345600",
    "DelaySeconds": "0",
    "ReceiveMessageWaitTimeSeconds": "10",
    "KmsMasterKeyId": "alias/aws/sqs",
    "KmsDataKeyReusePeriodSeconds": "300",
    "SqsManagedSseEnabled": "false",
    "FifoQueue": "true",
    "DeduplicationScope": "queue",
    "FifoThroughputLimit": "perQueue",
    "ContentBasedDeduplication": "false"
  }'

aws sqs create-queue --queue-name "${SONGBIRD_TEST_NOTIFICATION_QUEUE}" --attributes '{
    "VisibilityTimeout": "60",
    "MaximumMessageSize": "262144",
    "MessageRetentionPeriod": "345600",
    "DelaySeconds": "0",
    "RedrivePolicy": "${TN_REDRIVE_POLICY}",
    "ReceiveMessageWaitTimeSeconds": "10",
    "KmsMasterKeyId": "alias/aws/sqs",
    "KmsDataKeyReusePeriodSeconds": "300",
    "SqsManagedSseEnabled": "false",
    "FifoQueue": "true",
    "DeduplicationScope": "queue",
    "FifoThroughputLimit": "perQueue",
    "ContentBasedDeduplication": "false"
  }'
```

## Azure Event Hub

```shell
az eventhubs eventhub create \
  --resource-group <resource-group> \
  --namespace-name <namespace> \
  --name <new-eventhub-name> \
  --message-retention 7 \
  --partition-count 5 \
  --status Active \
  --capture-description '{
    "enabled": true,
    "encoding": "Avro",
    "intervalInSeconds": 300,
    "sizeLimitInBytes": 314572800,
    "destination": {
      "name": "EventHubArchive.AzureBlockBlob",
      "blobContainer": "dev-traces",
      "archiveNameFormat": "{Namespace}/{EventHub}/{PartitionId}/{Year}/{Month}/{Day}/{Hour}/{Minute}/{Second}",
      "storageAccountResourceId": "/subscriptions/<subscription-id>/resourceGroups/<resource-group>/providers/Microsoft.Storage/storageAccounts/<storage-account>"
    }
  }'
```
