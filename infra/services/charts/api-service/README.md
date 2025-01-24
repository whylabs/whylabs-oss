# songbird

![Version: 0.0.1](https://img.shields.io/badge/Version-0.0.1-informational?style=flat-square) ![Type: application](https://img.shields.io/badge/Type-application-informational?style=flat-square) ![AppVersion: 0.0.1](https://img.shields.io/badge/AppVersion-0.0.1-informational?style=flat-square)

WhyLabs Platform Helm Chart for Songbird

## Prerequisites

### Secrets

```shell
kubectl create secret generic songbird-gcp-service-account-json \
  --namespace infra-core \
  --from-file=gcp-serviceacct.json="path-to-downloaded-sa-file.json"

kubectl annotate secret songbird-gcp-service-account-json \
  --namespace infra-core \
  reflector.v1.k8s.emberstack.com/reflection-allowed="true" \
  reflector.v1.k8s.emberstack.com/reflection-auto-enabled="true" \
  reflector.v1.k8s.emberstack.com/reflection-allowed-namespaces="app-critical" \
  reflector.v1.k8s.emberstack.com/reflection-auto-namespaces="app-critical"
```

## Installing the Chart

```shell
# Downloads a .tgz file to the working directory or --destination path
helm pull \
  oci://ghcr.io/whylabs/songbird \
  --version 0.0.1

helm diff upgrade \
  --allow-unreleased \
  --namespace <target-namespace> \
  `# Specify the .tgz file as the chart` \
  songbird
  songbird-0.0.1.tgz
```

After you've installed the repo you can install the chart.

```shell
helm upgrade --install \
  --create-namespace \
  --namespace <target-namespace> \
  songbird
  songbird-0.0.1.tgz
```

## Horizontal Pod Autoscaling (HPA)

The Horizontal Pod Autoscaler automatically scales the number of pods in a
replication controller, deployment, replica set or stateful set based on
observed CPU utilization (or, with custom metrics support, on some other
application-provided metrics). The Horizontal Pod Autoscaler uses the following
formula to calculate the desired number of pods:

```text
Desired Replicas = [ (Current Utilization / Target Utilization) * Current Replicas ]
```

For example, if an HPA is configured with a target CPU utilization of 50%, there
are currently 3 pods, and the current average CPU utilization is 90%, the number
of replicas will be scaled to 6:

```text
Desired Replicas = ⌈ (90% / 50%) * 3 ⌉
                 = ⌈ 1.8 * 3 ⌉
                 = ⌈ 5.4 ⌉
                 = 6
```

HPA uses the same formula for both increasing and decreasing the number of pods.
Horizontal pod scaling is disabled by default. To enable it, set the
`hpa.enabled` key to `true`. The pods QoS class will impact HPA behavior as a
deployment that is allowed to burst CPU usage will cause more aggressive HPA
scaling than a deployment with a `Guaranteed` QoS that does not go above 100%
utilization.

## Values

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| affinity | object | `{}` | Affinity settings for `Pod` [scheduling](https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/). If an explicit label selector is not provided for pod affinity or pod anti-affinity one will be created from the pod selector labels. |
| autoscaling | object | `{"enabled":false,"maxReplicas":100,"minReplicas":1,"targetCPUUtilizationPercentage":70}` | [Horizontal Pod Autoscaler](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/) configuration for the `songbird` container. |
| commonLabels | object | `{}` | Labels to add to all chart resources. |
| env | object | `{"API_KEY_TABLE":"","AWS_MARKETPLACE_PRODUCT_CODE":"","AWS_MARKETPLACE_SUBSCRIPTION_DLQ_URL":"","AWS_MARKETPLACE_SUBSCRIPTION_QUEUE_URL":"","AZURE_EVENT_HUB_NAME":"","AZURE_SECRET_NAME":"","BASE_URL":"","CLOUDFRONT_LOG_DOMAIN":"","CLOUDFRONT_LOG_KEYPAIR_ID":"","CLOUDFRONT_LOG_SM_ID":"","CLOUDWATCH_NAMESPACE":"","DATADOG_METRICS_ENABLED":"","DATA_SERVICE_API_ENDPOINT":"","DATA_TABLE":"","DD_LOGS_INJECTION":"","DD_TRACE_SAMPLE_RATE":"","DEFAULT_JAVA_OPTS":"","DIAGNOSER_SERVICE_API_ENDPOINT":"","DRUID_INGESTION_KINESIS_DATA_STREAM":"","ELASTICSEARCH_ACCESS_ROLE":"","ELASTICSEARCH_ENDPOINT":"","GCP_PROJECT_ID":"","GCP_PUBSUB_TOPIC_NAME":"","GCP_SECRET_ID":"","GLOBAL_ACTIONS_TABLE":"","JAVA_OPTS":"","LDCLIENT_SECRET_ID":"","MERGER_SQS_QUEUE_NAME":"","METADATA_TABLE":"","MONITOR_CONFIG_DLQ_ARN":"","MONITOR_CONFIG_QUEUE_ARN":"","NOTIFICATION_QUEUE_ARN":"","OBSERVATORY_ENDPOINT":"","SCIM_SERVICE_API_ENDPOINT":"","SERVICE_OPTS":"","STAGE":"","STORAGE_BUCKET":"","STORAGE_BUCKET_UNTRUSTED_PREFIX":"","TEST_NOTIFICATION_DLQ_ARN":"","TEST_NOTIFICATION_QUEUE_ARN":"","USER_MEMBERSHIP_NOTIFICATION_DLQ_ARN":"","USER_MEMBERSHIP_NOTIFICATION_QUEUE_ARN":""}` | [Environment variables](https://kubernetes.io/docs/tasks/inject-data-application/define-environment-variable-container/) for the `songbird` container. |
| envFrom | object | `{}` |  |
| extraVolumeMounts | list | `[]` | Extra [volume mounts](https://kubernetes.io/docs/concepts/storage/volumes/) for the `songbird` container. |
| extraVolumes | list | `[]` | Extra [volumes](https://kubernetes.io/docs/concepts/storage/volumes/) for the `Pod`. |
| fullnameOverride | string | `""` | Override the full name of the chart. |
| image.pullPolicy | string | `"IfNotPresent"` | Image pull policy for the `songbird` container. |
| image.repository | string | `""` | Image repository for the `songbird` container. |
| image.tag | string | `"latest"` | Image tag for the `songbird` container, this will default to `.Chart.AppVersion` if not set. |
| imagePullSecrets[0] | list | `{"name":""}` | Image pull secrets for the `songbird` container. Defaults to `whylabs-{{ .Release.Name }}-registry-credentials`. |
| ingress | object | `{"enabled":false}` | [Ingress](https://kubernetes.io/docs/concepts/services-networking/ingress/) configuration for the `songbird` container. |
| javaLibVersion | string | `"v1.18.3"` | The Java Lib Version; used within a pod annotation for DataDog. |
| livenessProbe | object | `{"failureThreshold":10,"httpGet":{"path":"/health","port":"http"},"initialDelaySeconds":90,"periodSeconds":10}` | [Liveness probe](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/) configuration for the `songbird` container. |
| nameOverride | string | `""` | Override the name of the chart. |
| nodeSelector | object | `{}` | Node labels to match for `Pod` [scheduling](https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/). |
| podAnnotations | object | `{}` | Annotations to add to the `Pod`. |
| podLabels | object | `{}` | Labels to add to the `Pod`. |
| podSecurityContext | object | `{}` | [Pod security context](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.22/#podsecuritycontext-v1-core), this supports full customisation. |
| readinessProbe | object | `{"failureThreshold":20,"httpGet":{"path":"/health","port":"http"},"initialDelaySeconds":90,"periodSeconds":10}` | [Readiness probe](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/) configuration for the `songbird` container. |
| replicaCount | int | `3` | Number of replicas for the service. |
| resources | object | `{"limits":{"memory":"4000Mi"},"requests":{"cpu":"2","memory":"4000Mi"}}` | [Resources](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/) for the `songbird` container. |
| schedulerName | string | `""` |  |
| securityContext | object | `{}` | [Security context](https://kubernetes.io/docs/tasks/configure-pod-container/security-context/#set-the-security-context-for-a-container) for the `songbird` container. |
| service.annotations | object | `{"external-dns.alpha.kubernetes.io/hostname":"","service.beta.kubernetes.io/aws-load-balancer-additional-resource-tags":"","service.beta.kubernetes.io/aws-load-balancer-backend-protocol":"","service.beta.kubernetes.io/aws-load-balancer-connection-draining-enabled":"","service.beta.kubernetes.io/aws-load-balancer-connection-draining-timeout":"","service.beta.kubernetes.io/aws-load-balancer-nlb-target-type":"","service.beta.kubernetes.io/aws-load-balancer-scheme":"","service.beta.kubernetes.io/aws-load-balancer-ssl-cert":"","service.beta.kubernetes.io/aws-load-balancer-ssl-negotiation-policy":"","service.beta.kubernetes.io/aws-load-balancer-type":""}` | Service annotations. |
| service.loadBalancer | object | `{"scheme":"internet-facing","tls":{"arn":"","policy":"ELBSecurityPolicy-TLS-1-2-2017-01"},"type":"external"}` | Service LoadBalancer configuration. |
| service.loadBalancer.tls | object | `{"arn":"","policy":"ELBSecurityPolicy-TLS-1-2-2017-01"}` | ARN of the ACM certificate to use for the LoadBalancer. |
| service.targetPort | int | `8080` | The port on which the application container is listening. |
| service.type | string | `"LoadBalancer"` | Service Type, i.e. ClusterIp, LoadBalancer, etc. |
| serviceAccount.annotations | object | `{"eks.amazonaws.com/role-arn":""}` | Annotations to add to the service account. |
| serviceAccount.automount | bool | `true` | Set this to `false` to [opt out of API credential automounting](https://kubernetes.io/docs/tasks/configure-pod-container/configure-service-account/#opt-out-of-api-credential-automounting) for the `ServiceAccount`. |
| serviceAccount.create | bool | `true` | If `true`, create a new `ServiceAccount`. |
| serviceAccount.labels | object | `{}` | Labels to add to the service account. |
| serviceAccount.name | string | `""` | If this is set and `serviceAccount.create` is `true` this will be used for the created `ServiceAccount` name, if set and `serviceAccount.create` is `false` then this will define an existing `ServiceAccount` to use. |
| servicePrivate.annotations | object | `{"external-dns.alpha.kubernetes.io/hostname":"","service.beta.kubernetes.io/aws-load-balancer-backend-protocol":"","service.beta.kubernetes.io/aws-load-balancer-connection-draining-enabled":"","service.beta.kubernetes.io/aws-load-balancer-connection-draining-timeout":"","service.beta.kubernetes.io/aws-load-balancer-nlb-target-type":"ip","service.beta.kubernetes.io/aws-load-balancer-scheme":"","service.beta.kubernetes.io/aws-load-balancer-ssl-cert":"","service.beta.kubernetes.io/aws-load-balancer-ssl-negotiation-policy":"","service.beta.kubernetes.io/aws-load-balancer-type":""}` | Private Service annotations. |
| servicePrivate.enabled | bool | `false` | If `true`, create a private service. |
| servicePrivate.loadBalancer.scheme | string | `"internal"` |  |
| servicePrivate.loadBalancer.tls | object | `{"arn":"","policy":"ELBSecurityPolicy-TLS-1-2-2017-01"}` | ARN of the ACM certificate to use for the LoadBalancer. |
| servicePrivate.loadBalancer.type | string | `"external"` |  |
| servicePrivate.targetPort | int | `8080` | The port on which the application container is listening. |
| servicePrivate.type | string | `"LoadBalancer"` | Service Type, i.e. ClusterIp, LoadBalancer, etc. |
| tolerations | list | `[]` | Node taints which will be tolerated for `Pod` [scheduling](https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/). |

----------------------------------------------

Autogenerated from chart metadata using [helm-docs](https://github.com/norwoodj/helm-docs/).