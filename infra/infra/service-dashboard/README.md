# Dashboard

## Table of Contents

- [Environment Variables](#environment-variables)
- [S3 Buckets](#s3-buckets)
- [CloudWatch Log Group](#cloudwatch-log-group)
- [CloudWatch Log Stream](#cloudwatch-log-stream)
- [Secrets Manager Secret](#secrets-manager-secret)

## Environment Variables

> :information_source: See the [Environment Configuration](../../README.md#environment-configuration)
> for required environment variables. If additional environment configuration is
> required for the resources contained in this file, they will be specified in
> this section.

```shell
DASHBIRD_SECRET_BUCKET="whylabs-dashbird-secrets"
DASHBIRD_METADATA_BUCKET="whylabs-dashbird-metadata"

DASHBIRD_AUDIT_LOG_GROUP="whylabs-dashbird-audit-log"
DASHBIRD_AUDIT_LOG_STREAM="whylabs-dashbird-audit-log-stream"

FEEDBACK_WEBHOOK_SECRET="whylabs/dashbird/feedback-webhook"
```

## S3 Buckets

### Dashbird Secrets Bucket

```shell
aws s3api create-bucket \
  --bucket "${DASHBIRD_SECRET_BUCKET}" \
  --create-bucket-configuration LocationConstraint="${AWS_REGION}" \
  --query "Location" \
  --output text
```

### Dashbird Metadata Bucket

```shell
aws s3api create-bucket \
  --bucket "${DASHBIRD_METADATA_BUCKET}" \
  --create-bucket-configuration LocationConstraint="${AWS_REGION}" \
  --query "Location" \
  --output text
```

## CloudWatch Log Group

```shell
aws logs create-log-group \
  --log-group-name "${DASHBIRD_AUDIT_LOG_GROUP}"
```

## CloudWatch Log Stream

```shell
aws logs create-log-stream \
  --log-group-name "${DASHBIRD_AUDIT_LOG_GROUP}" \
  --log-stream-name "${DASHBIRD_AUDIT_LOG_STREAM}"
```

## Secrets Manager Secret

```shell
aws secretsmanager create-secret \
  --name "${FEEDBACK_WEBHOOK_SECRET}" \
  --secret-string "{}"
```
