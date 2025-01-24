# dataservice

![Version: 0.0.1](https://img.shields.io/badge/Version-0.0.1-informational?style=flat-square) ![Type: application](https://img.shields.io/badge/Type-application-informational?style=flat-square) ![AppVersion: 0.0.1](https://img.shields.io/badge/AppVersion-0.0.1-informational?style=flat-square)

WhyLabs Platform Helm Chart for Dataservice

## Installing the Chart

```shell
# Downloads a .tgz file to the working directory or --destination path
helm pull \
  oci://ghcr.io/whylabs/dataservice \
  --version 0.0.1

helm diff upgrade \
  --allow-unreleased \
  --namespace <target-namespace> \
  `# Specify the .tgz file as the chart` \
  dataservice
  dataservice-0.0.1.tgz
```

After you've installed the repo you can install the chart.

```shell
helm upgrade --install \
  --create-namespace \
  --namespace <target-namespace> \
  dataservice
  dataservice-0.0.1.tgz
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
| autoscaling | object | `{"enabled":false,"maxReplicas":100,"minReplicas":1,"targetCPUUtilizationPercentage":70}` | [Horizontal Pod Autoscaler](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/) configuration for the `dataservice` container. |
| commonLabels | object | `{}` | Labels to add to all chart resources. |
| env | object | `{"AZURE_APP_ID":"","AZURE_APP_TENANT":"","AZURE_DATA_EXPLORER_CLUSTER_PATH":"","AZURE_ENABLED":"{{ if eq .Values.instance \"main\" }}true{{ else }}false{{ end }}","AZURE_KUSTO_DATABASE":"","AZURE_SECRET_NAME":"","BULK_JDBC_MAX_POOL_SIZE":"4","DB_HOST":"","DB_HOST_BULK":"","DB_PASSWORD":{"valueFrom":{"secretKeyRef":{"key":"password","name":"","optional":false}}},"DB_STANDBY_PASSWORD":{"valueFrom":{"secretKeyRef":{"key":"password","name":"","optional":false}}},"DB_STANDBY_POOLER_HOST":"","DB_STANDBY_USER":{"valueFrom":{"secretKeyRef":{"key":"username","name":"","optional":false}}},"DB_USER":{"valueFrom":{"secretKeyRef":{"key":"username","name":"","optional":false}}},"ENABLE_LIQUIDBASE":"{{ if eq .Values.instance \"backfill\" }}true{{ else }}false{{ end }}","FASTAPI_HOST":"arima.whylabs.svc.cluster.local.","GITLAB_SHA":"","HOST_IP":{"valueFrom":{"fieldRef":{"apiVersion":"v1","fieldPath":"status.hostIP"}}},"INDEXER_THREAD_COUNT":"32","INSTANCE":"{{ .Values.instance }}","JDBC_CONNECTION_TIMEOUT":"30000","JDBC_MAX_POOL_SIZE":"16","LOG_LEVEL":"INFO","METRIC_ENABLED":"true","OTEL_EXPORTER_OTLP_ENDPOINT":"","POSTGRES_BULK":"","POSTGRES_HOST":"","POSTGRES_REPL":"","READONLY_JDBC_MAX_POOL_SIZE":"200","SIREN_NOTIFICATION_TOPIC":"","WHYLABS_ANALYZER_RESULTS_TABLE":"","WHYLABS_ARTIFACTS_DOWNLOAD_BUCKET":"","WHYLABS_BULK_INGESTION_TRIGGER_TOPIC":"","WHYLABS_CLOUDTRAIL_BUCKET":"","WHYLABS_DATASERVICE_APPLICATION_NAME":"","WHYLABS_DATASERVICE_DRUID_SECRET":"","WHYLABS_DATASERVICE_ENABLE_BACKFILL":"{{ if eq .Values.instance \"backfill\" }}true{{ else }}false{{ end }}","WHYLABS_DATASERVICE_ENABLE_KINESIS":"{{ if eq .Values.instance \"kinesis\" }}true{{ else }}false{{ end }}","WHYLABS_OPERATIONAL_METRICS_STREAM":"","WHYLABS_PROFILE_TABLE":"","WHYLABS_PROFILE_UPLOAD_NOTIFICATION_TOPIC":"","WHYLABS_SONGBIRD_BUCKET":"","_JAVA_OPTIONS":"-Xms512M -Xmx4620M -XX:+ParallelRefProcEnabled -XX:+UseG1GC -XX:+ExitOnOutOfMemoryError -XX:+HeapDumpOnOutOfMemoryError -XX:HeapDumpPath=/efs/heapdumps/{{ .Chart.Name }}-{{ .Values.instance }}/ -XX:MaxGCPauseMillis=500 -XX:+DisableExplicitGC -XX:+UseStringDeduplication -XX:MaxMetaspaceSize=256m -Duser.timezone=UTC -Dfile.encoding=UTF-8"}` | [Environment variables](https://kubernetes.io/docs/tasks/inject-data-application/define-environment-variable-container/) for the `dataservice` container. |
| envFrom | list | `[]` |  |
| extraVolumeMounts | list | `[{"mountPath":"/efs","name":"efs-volume"}]` | Extra [volume mounts](https://kubernetes.io/docs/concepts/storage/volumes/) for the `dataservice` container. |
| extraVolumes | list | `[{"name":"efs-volume","persistentVolumeClaim":{"claimName":"efs-pvc"}}]` | Extra [volumes](https://kubernetes.io/docs/concepts/storage/volumes/) for the `Pod`. |
| fullnameOverride | string | `""` | Override the full name of the chart. |
| image.pullPolicy | string | `"IfNotPresent"` | Image pull policy for the `dataservice` container. |
| image.repository | string | `"registry.gitlab.com/whylabs/core/whylabs-processing-core"` | Image repository for the `dataservice` container. |
| image.tag | string | `"latest"` | Image tag for the `dataservice` container, this will default to `.Chart.AppVersion` if not set. |
| imagePullSecrets[0] | list | `{"name":""}` | Image pull secrets for the `dataservice` container. Defaults to `gitlab-container-registry-auth`. |
| ingress | object | `{"enabled":false}` | [Ingress](https://kubernetes.io/docs/concepts/services-networking/ingress/) configuration for the `dataservice` container. |
| instance | string | `"main"` | Instance is used to distinguish between different versions of dataservice can be of type `main`, `backfill`, `monitor`, or `kinesis`. |
| livenessProbe | object | `{"failureThreshold":3,"httpGet":{"path":"/health","port":"http"},"initialDelaySeconds":600,"periodSeconds":15,"successThreshold":1,"terminationGracePeriodSeconds":60,"timeoutSeconds":4}` | [Liveness probe](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/) configuration for the `dataservice` container. |
| nameOverride | string | `""` | Override the name of the chart. |
| nodeSelector | object | `{}` | Node labels to match for `Pod` [scheduling](https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/). |
| pdb | object | `{"enabled":true,"maxUnavailable":1}` | Pod Disruption Budget |
| podAnnotations | object | `{}` | Annotations to add to the `Pod`. |
| podLabels | object | `{}` | Labels to add to the `Pod`. |
| podSecurityContext | object | `{}` | [Pod security context](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.22/#podsecuritycontext-v1-core), this supports full customisation. |
| readinessProbe | object | `{"failureThreshold":30,"httpGet":{"path":"/health","port":"http"},"periodSeconds":10,"successThreshold":1,"timeoutSeconds":2}` | [Readiness probe](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/) configuration for the `dataservice` container. |
| replicaCount | int | `3` | Number of replicas for the service. |
| resources | object | `{"limits":{"memory":"5Gi"},"requests":{"cpu":"500m","memory":"5Gi"}}` | [Resources](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/) for the `dataservice` container. |
| schedulerName | string | `""` |  |
| securityContext | object | `{}` | [Security context](https://kubernetes.io/docs/tasks/configure-pod-container/security-context/#set-the-security-context-for-a-container) for the `dataservice` container. |
| service.annotations | object | `{}` | Service annotations. |
| service.create | bool | `false` | If `true`, create a new `ServiceAccount`. |
| service.name | string | `""` | Service name. Defaults to release name if none provided. |
| service.port | int | `80` | Service HTTP port. |
| service.targetPort | int | `8090` | The port on which the application container is listening. |
| service.type | string | `"ClusterIP"` | Service Type, i.e. ClusterIp, LoadBalancer, etc. |
| serviceAccount.annotations | object | `{"eks.amazonaws.com/role-arn":""}` | Annotations to add to the service account. |
| serviceAccount.automount | bool | `true` | Set this to `false` to [opt out of API credential automounting](https://kubernetes.io/docs/tasks/configure-pod-container/configure-service-account/#opt-out-of-api-credential-automounting) for the `ServiceAccount`. |
| serviceAccount.create | bool | `true` | If `true`, create a new `ServiceAccount`. |
| serviceAccount.labels | object | `{}` | Labels to add to the service account. |
| serviceAccount.name | string | `""` | If this is set and `serviceAccount.create` is `true` this will be used for the created `ServiceAccount` name, if set and `serviceAccount.create` is `false` then this will define an existing `ServiceAccount` to use. |
| startupProbe | object | `{"failureThreshold":60,"periodSeconds":5,"successThreshold":1,"tcpSocket":{"port":8090},"timeoutSeconds":1}` | [Startup probe](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/) configuration for the `dataservice` container. |
| tolerations | list | `[]` | Node taints which will be tolerated for `Pod` [scheduling](https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/). |
| updateStrategy.rollingUpdate.maxSurge | int | `0` |  |
| updateStrategy.rollingUpdate.maxUnavailable | int | `1` |  |
| updateStrategy.type | string | `"RollingUpdate"` | Update strategy; configure the maximum number of pods that can be unavailable at a time during updates. |

----------------------------------------------

Autogenerated from chart metadata using [helm-docs](https://github.com/norwoodj/helm-docs/).