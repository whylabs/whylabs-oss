# WhyLabs Platform Services

## Build Images

### API Service
    
```shell
# Build project
docker run --rm \
  --volume "$(pwd):/home/gradle/project" \
  --volume "$(pwd)/.gradle:/home/gradle/.gradle" \
  --workdir /home/gradle/project \
  gradle:7.5.1-jdk11 \
  gradle --build-cache build distTar

# Build x86_64 image
docker buildx build \
  --load \
  --platform linux/amd64 \
  --tag latest \
  .

# Build arm64 image
docker buildx build \
  --load \
  --platform linux/arm64 \
  --tag latest \
  .
```

### Dataservice

```shell
cd python

# Build x86_64 image
docker buildx build \
  --load \
  --platform linux/amd64 \
  --file x86_64.Dockerfile \
  --tag latest \
  .

# Build arm64 image
docker buildx build \
  --load \
  --platform linux/arm64 \
  --file aarch64.Dockerfile \
  --tag latest \
  .
```

## Install Services

See the individual Helm chart's README for more details.

### Dataservice Main

```shell
helm upgrade --install \
  --namespace whylabs \
  --create-namespace \
  --set instance=main \
  whylabs-dataservice-main \
  ./charts/dataservice
```

### Dataservice Kinesis

```shell
helm upgrade --install \
  --namespace whylabs \
  --create-namespace \
  --set instance=kinesis \
  whylabs-dataservice-kinesis \
  ./charts/dataservice
```

### Dataservice Backfill

```shell
helm upgrade --install \
  --namespace whylabs \
  --create-namespace \
  --set instance=backfill \
  whylabs-dataservice-backfill \
  ./charts/dataservice
```

### Dataservice Monitor

```shell
helm upgrade --install \
  --namespace whylabs \
  --create-namespace \
  --set instance=monitor \
  whylabs-dataservice-monitor \
  ./charts/dataservice
```

### API Service

```shell
helm upgrade --install \
  --namespace whylabs \
  --create-namespace \
  whylabs-api-service \
  ./charts/api-service
```

### Notifications Service

```shell
helm upgrade --install \
  --namespace whylabs \
  --create-namespace \
  whylabs-notifications \
  ./charts/notifications
```

### Smart Config

```shell
helm upgrade --install \
  --namespace whylabs \
  --create-namespace \
  whylabs-smart-config \
  ./charts/smart-config
```

### Dashboard

```shell
helm upgrade --install \
  --namespace whylabs \
  --create-namespace \
  whylabs-dashboard \
  ./charts/dashboard
```

### Scim

```shell
kubectl apply -f - <<EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: whylabs-scim
  namespace: whylabs
spec:
  replicas: 3
  selector:
    matchLabels:
      app: scim
  template:
    metadata:
      annotations:
      labels:
        app: scim
      namespace: whylabs
    spec:
      containers:
        - name: main
          env:
            - name: SONGBIRD_API_ENDPOINT
              value: ""
          image: ""
          imagePullPolicy: IfNotPresent
          livenessProbe:
            failureThreshold: 1
            httpGet:
              path: /ping
              port: http-port
              scheme: HTTP
            initialDelaySeconds: 600
            terminationGracePeriodSeconds: 60
            timeoutSeconds: 2
          ports:
            - containerPort: 8891
              name: http-port
              protocol: TCP
          readinessProbe:
            failureThreshold: 30
            httpGet:
              path: /ping
              port: http-port
              scheme: HTTP
            timeoutSeconds: 2
          resources:
            limits:
              memory: 150Mi
            requests:
              cpu: 100m
              memory: 150Mi
          startupProbe:
            failureThreshold: 60
            periodSeconds: 5
            tcpSocket:
              port: http-port
EOF
```
