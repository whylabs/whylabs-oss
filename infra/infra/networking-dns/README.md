# Networking DNS

## Overview

This guide will create the following resources:

- Route53 Hosted Zone (if it does not exist)
- Route53 Delegated Subdomain Hosted Zone

## Table of Contents

- [Environment Variables](#environment-variables)
- [DNS](#dns)
  - [Route53](#route53)

## Environment Variables

> :information_source: See the [Environment Configuration](../../README.md#environment-configuration)
> for required environment variables. If additional environment configuration is
> required for the resources contained in this file, they will be specified in
> this section.

## DNS

### Route53

#### Primary Hosted Zone

Create the hosted zone if it does not exist.

```shell
# Check if zone exists first
EXISTING_ZONE_ID=$(aws route53 list-hosted-zones-by-name \
  --dns-name "${R53_ZONE_NAME}" \
  --query "HostedZones[?Name=='${R53_ZONE_NAME}.'].Id" \
  --output text)

if [ -z "${EXISTING_ZONE_ID}" ]; then
  aws route53 create-hosted-zone \
    --name "${R53_ZONE_NAME}" \
    --caller-reference "$(date +%s)"
else
  echo "Zone ${R53_ZONE_NAME} already exists with ID ${EXISTING_ZONE_ID}"
fi
```

#### Delegated Subdomain Hosted Zone

Created a hosted zone for the subdomain to separate the domain from the parent
zone. **Important:** After creating the subdomain hosted zone, you will need to
add an NS record in the parent zone pointing to the nameservers of the subdomain
hosted zone, ensuring DNS queries for the subdomain are properly delegated and
resolved.

> :information_source: DNS delegation allows you to isolate and independently
> manage the subdomain's DNS records while maintaining a hierarchical
> relationship with the parent domain, improving administrative control and
> flexibility.

```shell
aws route53 create-hosted-zone \
  --name "${SUBDOMAIN}.${R53_ZONE_NAME}" \
  --caller-reference "$(date +%s)"
```
