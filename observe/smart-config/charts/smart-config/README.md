# Smart Config Helm Chart

## Deployment

### Check your k8s context

```shell
kubectl config current-context 
```

### Change your current k8s context

```shell
kubectl config get-contexts
kubectl config use-context arn:aws:eks:us-west-2:222222222222:cluster/development-cluster
```

### Diff
View the difference between the current state and desired state

```shell
# Requires the helm-diff plugin to be installed:
# helm plugin install https://github.com/databus23/helm-diff
helm diff upgrade \
  --allow-unreleased \
  --namespace corestack \
  smart-config charts/smart-config
```

### Install/Update
```shell
helm upgrade --install \
  --create-namespace \
  --namespace corestack \
  smart-config charts/smart-config
```

### Uninstall
```shell
helm uninstall \
  --namespace corestack \
  smart-config charts/smart-config
```
