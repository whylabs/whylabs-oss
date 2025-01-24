# dashbird

![Version: 0.0.1](https://img.shields.io/badge/Version-0.0.1-informational?style=flat-square) ![Type: application](https://img.shields.io/badge/Type-application-informational?style=flat-square) ![AppVersion: 0.0.1](https://img.shields.io/badge/AppVersion-0.0.1-informational?style=flat-square)

WhyLabs Platform Helm Chart for Dashbird

## Installation

### Pull the chart

```shell
# Downloads a .tgz file to the working directory or --destination path
helm pull \
  oci://ghcr.io/whylabs/dashbird \
  --version 0.0.1

helm diff upgrade \
  --allow-unreleased \
  --namespace <target-namespace> \
  `# Specify the .tgz file as the chart` \
  dashbird dashbird-0.0.1.tgz
```

### Install the chart

```shell
helm upgrade --install \
  --create-namespace \
  --namespace <target-namespace> \
  dashbird dashbird-0.0.1.tgz
```

## Templating Support in Values File

> See the [Values](#values) section for more information on the values that
support templates.

### Overview

This Helm chart provides advanced support for templating directly
within the values.yaml file. By leveraging Helm's powerful templating engine,
users can dynamically generate values based on their deployment context. This
allows for flexible, context-aware configurations that automatically adapt to
the specific environment, release, or other settings defined during chart
installation.

### How Templating Works Templating within the values.yaml file works similarly
to templating in Helm chart templates. You can use Go templating syntax to
dynamically generate values based on the built-in Helm objects like .Values,
.Release, .Chart, and more.

For example, you can use templating to automatically inject the release name,
set image tags based on a commit SHA, or dynamically generate labels and
annotations based on the environment.

### Usage Examples Here are a few common use cases where templating in the
values.yaml file can be particularly powerful:

- **Dynamic Image Tags**:

  Automatically set the image tag based on the commit SHA, branch name, or other
  Git metadata.

    ```yaml
    image:
      repository: "registry.gitlab.com/whylabs/<CHARTNAME>"
      tag: "{{ .Values.commitSha }}"
    ```

- **Conditional Environment Variables**:

  Set environment variables based on conditions, such as the deployment
  environment.

    ```yaml
    env:
      MY_ENV_VAR: "my env var value"
      MY_TEMPLATE_VAR: "{{ if eq .Values.instance \"main\" }}true{{ else }}false{{ end }}"
    ```

- **Dynamic Labels and Annotations**:

  Use templating to dynamically generate labels and annotations based on the
  release or environment.

    ```yaml
    commonLabels:
      template.example.com/env: "{{ .Values.environment }}"

    podAnnotations:
      template.example.com/sha: "{{ .Values.commitSha }}"
    ```

## User-Defined Supplemental Kubernetes Manifests

### Overview

The extraManifests field in the values.yaml file provides a flexible way to
include additional Kubernetes resource manifests as part of your Helm release.
This field is designed to accept a list of Kubernetes manifest definitions,
allowing you to specify any arbitrary Kubernetes resources that should be
deployed alongside the standard resources defined in the Helm chart.

### How It Works

The extraManifests field is a list where each item represents a complete
Kubernetes resource definition, written in YAML. These resources are processed
and deployed as part of the Helm release, just like the chart's built-in
resources. This functionality is particularly useful when you need to deploy
custom resources, additional ConfigMaps, Jobs, or other Kubernetes objects that
aren't covered by the main chart templates.

### Templating Support

Like other parts of the values.yaml file, the extraManifests field fully
supports Helm's templating engine. This means you can use templating syntax to
dynamically generate values within your custom resources based on the deployment
context. For example, you can inject the release name, environment-specific
settings, or other dynamic values directly into your additional manifests.

### Usage Example

Here’s how you can use the extraManifests field to include additional resources
with your Helm deployment:

```yaml
extraManifests:
  - apiVersion: batch/v1
    kind: Job
    metadata:
      name: "{{.Release.Name }}-job"
      annotations:
        "helm.sh/hook": pre-install
    spec:
      template:
        metadata:
          labels:
            app.kubernetes.io/managed-by: "{{ .Release.Service }}"
            app.kubernetes.io/instance: "{{ .Release.Name }}"
            helm.sh/chart: "{{ .Chart.Name }}-{{ .Chart.Version }}"
        spec:
          restartPolicy: Never
          containers:
          - name: example-job
            image: "alpine:3.3"
            command:
              - "/bin/sleep"
              - "10"
  - apiVersion: v1
    kind: ConfigMap
    metadata:
      name: "{{ .Release.Name }}-config"
    data:
      my-config-key: "my-config-value"
```

In this example:

- The first item adds a Kubernetes Job to the deployment, which will run as a
pre-install hook, executing before the main resources are deployed.

- The second item adds a ConfigMap to the deployment, allowing you to define
configuration data that can be used by other resources in the cluster.

### Why Use extraManifests?

- Flexibility: Deploy any Kubernetes resource alongside your Helm release,
whether it's a custom resource (CR), additional service, or any other Kubernetes
object.

- Centralized Management: Manage all related Kubernetes resources in a single
Helm chart, reducing the need to deploy additional manifests separately.

- Templating: Use the power of Helm's templating engine to create dynamic,
context-aware resources that automatically adapt to your environment or release
settings.

## Values

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| affinity | object | `{}` | Affinity settings for `Pod` [scheduling constraints](https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/). If an explicit label selector is not provided for pod affinity or pod anti-affinity one will be created from the pod selector labels. |
| autoscaling | object | `{"enabled":false,"maxReplicas":100,"minReplicas":1,"targetCPUUtilizationPercentage":70}` | [Horizontal Pod Autoscaler](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/) configuration for the `dashbird` container. |
| commonLabels | object | `{}` | Labels to add to all chart resources. **This setting supports templating, see the values.yaml file for an example**. |
| env | object | `{"AUDIT_LOG_GROUP":"","AUDIT_LOG_STREAM":"","BASE_URL":"","DATA_SERVICE_API_ENDPOINT":"","DEMO_ORG_ID":"","FEEDBACK_WEBHOOK_SECRET_ID":"","METADATA_BUCKET":"","NODE_ENV":"production","SECRET_BUCKET":"","SONGBIRD_API_ENDPOINT":"","SONGBIRD_ROLE_ARN":"","STAGE":"","TOTAL_SERVICE_NODES":"2"}` | [Environment variables](https://kubernetes.io/docs/tasks/inject-data-application/define-environment-variable-container/) for the `dashbird` container. This is a map of key-value pairs, where the key is the environment variable name and the value is the environment variable value. Maps are preferred to lists because they are easier to merge. This allows for overriding, merging, and removing keys. This setting supports templating, see the values.yaml file for an example. |
| envFrom | object | `{}` | [Environment variables from sources](https://kubernetes.io/docs/tasks/inject-data-application/define-environment-variable-container/) for the `dashbird` container. |
| extraVolumeMounts | list | `[]` | Extra [volume mounts](https://kubernetes.io/docs/concepts/storage/volumes/) for the `dashbird` container. |
| extraVolumes | list | `[]` | Extra [volumes](https://kubernetes.io/docs/concepts/storage/volumes/) for the `Pod`. |
| fullnameOverride | string | `""` | Override the full name of the chart. |
| image.args | list | `[]` | Arguments to the command to run in the `dashbird` container. |
| image.command | list | `[]` | Command to run in the `dashbird` container. |
| image.pullPolicy | string | `"IfNotPresent"` | Image pull policy for the `dashbird` container. |
| image.repository | string | `"registry.gitlab.com/whylabs/dashboard-service/dashbird"` | Image repository for the `dashbird` container. |
| image.tag | string | `"latest"` | Image tag for the `dashbird` container, this will default to `.Chart.AppVersion` if not set. **This setting supports templating, see the values.yaml file for an example**. |
| imagePullSecrets | list | `[]` | Image pull secrets for the `dashbird` container. |
| ingress | object | `{"enabled":false}` | [Ingress](https://kubernetes.io/docs/concepts/services-networking/ingress/) configuration for the `dashbird` container. |
| instance | string | `""` | Instance is used to distinguish between multiple releases deployed with the same chart. This setting is primarily used for templating. |
| livenessProbe | object | `{"failureThreshold":3,"httpGet":{"path":"/status","port":"http","scheme":"HTTP"},"initialDelaySeconds":20,"periodSeconds":3,"successThreshold":1,"timeoutSeconds":3}` | [Liveness probe](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/) configuration for the `dashbird` container. |
| nameOverride | string | `""` | Override the name of the chart. |
| nodeSelector | object | `{}` | Node labels to match for `Pod` [scheduling](https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/). |
| overrideSelectorLabels | object | `{}` |  |
| podAnnotations | object | `{}` | Annotations to add to the `Pod`. **This setting supports templating, see the values.yaml file for an example**. |
| podLabels | object | `{}` | Labels to add to the `Pod`. **This setting supports templating, see the values.yaml file for an example**. |
| podSecurityContext | object | `{}` | [Pod security context](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.22/#podsecuritycontext-v1-core), this supports full customisation. |
| readinessProbe | object | `{"failureThreshold":20,"httpGet":{"path":"/status","port":"http"},"initialDelaySeconds":10,"periodSeconds":10,"successThreshold":1,"timeoutSeconds":3}` | [Readiness probe](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/) configuration for the `dashbird` container. |
| replicaCount | int | `3` | Number of replicas for the service. Ignored if `autoscaling.enabled` is `true`. |
| resources | object | `{"limits":{"memory":"4000Mi"},"requests":{"cpu":"150m","memory":"800Mi"}}` |  [Resources](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/) for the `dashbird` container. |
| securityContext | object | `{}` | [Security context](https://kubernetes.io/docs/tasks/configure-pod-container/security-context/#set-the-security-context-for-a-container) for the `dashbird` container. |
| service.annotations | object | `{"external-dns.alpha.kubernetes.io/hostname":"","service.beta.kubernetes.io/aws-load-balancer-backend-protocol":"tcp","service.beta.kubernetes.io/aws-load-balancer-connection-draining-enabled":"true","service.beta.kubernetes.io/aws-load-balancer-connection-draining-timeout":"60","service.beta.kubernetes.io/aws-load-balancer-nlb-target-type":"ip","service.beta.kubernetes.io/aws-load-balancer-scheme":"internet-facing","service.beta.kubernetes.io/aws-load-balancer-ssl-cert":"","service.beta.kubernetes.io/aws-load-balancer-ssl-negotiation-policy":"ELBSecurityPolicy-TLS-1-2-2017-01"}` | Service annotations. |
| service.labels | object | `{}` | Service labels. |
| service.name | string | `""` | Override service name, useful for adopting an existing service. If blank, the service name will be the release name. |
| service.port | int | `443` | Service HTTP port. |
| service.targetPort | int | `3000` | The port on which the application container is listening. |
| service.type | string | `"LoadBalancer"` | Service Type, i.e. ClusterIp, LoadBalancer, etc. |
| serviceAccount.annotations | object | `{"eks.amazonaws.com/role-arn":""}` | Annotations to add to the service account. |
| serviceAccount.automount | bool | `true` | Set this to `false` to [opt out of API credential automounting](https://kubernetes.io/docs/tasks/configure-pod-container/configure-service-account/#opt-out-of-api-credential-automounting) for the `ServiceAccount`. |
| serviceAccount.create | bool | `true` | If `true`, create a new `ServiceAccount`. |
| serviceAccount.labels | object | `{}` | Labels to add to the service account. |
| serviceAccount.name | string | `""` | If this is set and `serviceAccount.create` is `true` this will be used for the created `ServiceAccount` name, if set and `serviceAccount.create` is `false` then this will define an existing `ServiceAccount` to use. |
| startupProbe | object | `{}` | [Startup probe](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/) configuration for the `dashbird` container. |
| tolerations | list | `[]` | Node taints which will be tolerated for `Pod` [scheduling](https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/). |

----------------------------------------------

Autogenerated from chart metadata using [helm-docs](https://github.com/norwoodj/helm-docs/).