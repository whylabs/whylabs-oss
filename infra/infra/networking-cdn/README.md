# Networking CDN

## Table of Contents

- [Environment Variables](#environment-variables)
- [CloudFront](#cloudfront)

## Environment Variables

> :information_source: See the [Environment Configuration](../../README.md#environment-configuration)
> for required environment variables. If additional environment configuration is
> required for the resources contained in this file, they will be specified in
> this section.

```shell
SONGBIRD_BUCKET="whylabs-songbird-bucket"
```

## CloudFront Distribution

```shell
OAC_CONFIG=$(cat <<EOF
{
  "Name": "OAC-for-CloudFront",
  "Description": "OAC for secure S3 access",
  "SigningProtocol": "sigv4",
  "SigningBehavior": "always",
  "OriginAccessControlOriginType": "s3"
}
EOF
)

OAC_ID=$(aws cloudfront create-origin-access-control \
  --origin-access-control-config "${OAC_CONFIG}" \
  --query "OriginAccessControl.Id" \
  --output text)

LOG_CLOUDFRONT_CONFIG=$(cat <<EOF
{
  "CallerReference": "$(date +%s)",
  "Aliases": {
    "Quantity": 1,
    "Items": [
      "${SUBDOMAIN}.${R53_ZONE_NAME}"
    ]
  },
  "Origins": {
    "Quantity": 1,
    "Items": [
      {
        "Id": "s3Origin",
        "DomainName": "${BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com",
        "OriginPath": "",
        "CustomHeaders": {
          "Quantity": 0
        },
        "S3OriginConfig": {
          "OriginAccessIdentity": ""
        },
        "OriginAccessControlId": "${OAC_ID}"
      }
    ]
  },
  "DefaultCacheBehavior": {
    "TargetOriginId": "s3Origin",
    "ViewerProtocolPolicy": "https-only",
    "AllowedMethods": {
      "Quantity": 7,
      "Items": [
        "HEAD",
        "DELETE",
        "POST",
        "GET",
        "OPTIONS",
        "PUT",
        "PATCH"
      ],
      "CachedMethods": {
        "Quantity": 2,
        "Items": [
          "HEAD",
          "GET"
        ]
      }
    },
    "Compress": true,
    "ForwardedValues": {
      "QueryString": false,
      "Cookies": {
        "Forward": "none"
      }
    },
    "MinTTL": 0,
    "DefaultTTL": 3600,
    "MaxTTL": 86400
  },
  "Comment": "CloudFront distribution for ${SUBDOMAIN}.${R53_ZONE_NAME}",
  "PriceClass": "PriceClass_100",
  "Enabled": true,
  "ViewerCertificate": {
    "ACMCertificateArn": "${CERTIFICATE_ARN}",
    "SSLSupportMethod": "sni-only",
    "MinimumProtocolVersion": "TLSv1.2_2021"
  },
  "Restrictions": {
    "GeoRestriction": {
      "RestrictionType": "none",
      "Quantity": 0
    }
  },
  "HttpVersion": "http2",
  "IsIPV6Enabled": true
}
EOF
)

LOG_CF_DISTRIBUTION_ID=$(aws cloudfront create-distribution \
  --distribution-config "${LOG_CLOUDFRONT_CONFIG}"
  --query "Distribution.Id" \
  --output text)
```

## Update Songbird Bucket Policy

```shell
SONGBIRD_CF_BUCKET_POLICY=$(cat <<EOF
{
  "Version": "2008-10-17",
  "Id": "PolicyForCloudFrontPrivateContent",
  "Statement": [
    {
      "Sid": "CloudFrontCanReadAndWrite",
      "Effect": "Allow",
      "Principal": {
        "Service": "cloudfront.amazonaws.com"
      },
      "Action": [
        "s3:GetObject",
        "s3:PutObject"
      ],
      "Resource": "arn:aws:s3:::${SONGBIRD_BUCKET}/*",
      "Condition": {
        "StringEquals": {
          "AWS:SourceArn": "arn:aws:cloudfront::${AWS_ACCOUNT_ID}:distribution/${LOG_CF_DISTRIBUTION_ID}"
        }
      }
    }
  ]
}
EOF
)

aws s3api put-bucket-policy \
  --bucket "${SONGBIRD_BUCKET}" \
  --policy "${SONGBIRD_CF_BUCKET_POLICY}"
```