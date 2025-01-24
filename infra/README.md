# WhyLabs Infrastructure

This repository contains a best-effort set of scripts to create and configure
the infrastructure resources required to host the WhyLabs platform.

## Provision Infrastructure

### Environment Configuration

The following environment variables are generally required for most of the
sections in this guide and must exist to ensure proper configuration. Each
section will contain additional environment configuration requirements specific
to the resources in their respective README.

```shell
# Generally configured to the name of the organization
ENTITY="yeet"

# Target AWS Account ID in which to deploy the WhyLabs platform infrastructure
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# Target AWS Region in which to deploy the WhyLabs platform infrastructure.
# Some resources are region-specific; the commands in this guide will reflect
# this requirement by specifying the region as a parameter. Generally, it is
# recommended to not override hard-coded regions unless the implications are
# well understood.
AWS_REGION="us-west-2"

# Primary Route53 Hosted Zone Name
R53_ZONE_NAME="development.whylabsdev.com"

# Subdomain in which the platform will be hosted. We recommend creating a
# dedicated hosted zone for the deployment to separate the domain from the
# parent zone for better administrative control and flexibility.
SUBDOMAIN="yeet"
```

### Installation

#### Infrastructure

  1. [DNS](./infra/networking-dns/README.md)

  1. [API Service](./infra/service-api-service/README.md)

  1. [TLS](./infra/networking-tls/README.md)

  1. [CDN](./infra/networking-cdn/README.md)

  1. [Dashboard](./infra/service-dashboard/README.md)

  1. [Dataservice](./infra/service-dataservice/README.md)

  1. [Notification Service](./infra/service-notifications/README.md)

  1. [Kubernetes](./infra/kubernetes/README.md)

#### Infrastructure Services

  1. [Ingress Nginx](https://kubernetes.github.io/ingress-nginx/)

  1. Deploy the [CNPG Postgres](https://cloudnative-pg.io/documentation/1.25/)
     controller.

  1. Build the [WhyLabs CNPG Image](./postgres/README.md) and use it when
     deploying the CNPG Cluster resource.

#### Application Services

  1. [Build Images](./services/README.md#build-images)

  1. [Install Services](./services/README.md#install-services)
