# Networking TLS

## Table of Contents

- [Environment Variables](#environment-variables)
- [ACM](#acm)

## Environment Variables

> :information_source: See the [Environment Configuration](../../README.md#environment-configuration)
> for required environment variables. If additional environment configuration is
> required for the resources contained in this file, they will be specified in
> this section.

## ACM

```shell
# === Create an ACM Certificate ===
CERTIFICATE_ARN=$(aws acm request-certificate \
  --domain-name "${SUBDOMAIN}.${R53_ZONE_NAME}" \
  --validation-method DNS \
  --subject-alternative-names "*.${SUBDOMAIN}.${R53_ZONE_NAME}" \
  --query "CertificateArn" \
  --region us-east-1 \
  --output text)

export CERTIFICATE_ARN
```
