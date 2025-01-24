# Kubernetes

## Create a VPC, EKS cluster, and accompanying resources

> :information_source: Update the `AWS_ACCOUNT_ID` in the `cluster.yaml` file
with the correct value for your account.

```shell
# make sure you are logged out of public.ecr.aws docker registry
docker logout public.ecr.aws

# Create the cluster and accompanying resources
eksctl create cluster --config-file cluster.yaml
```

## Create Karpenter Node Pool

Use the following commands to get the latest version of Bottlerocket AMIs.

> :information_source: Update the kubernetes version in the SSM path

```shell
# Retrieve amd64 versions
aws ssm get-parameter \
  --name /aws/service/bottlerocket/aws-k8s-1.30/x86_64/latest/image/release-version \
  --region us-west-2 \
  --query "Parameter.Value" \
  --output text

# Retrieve arm64 versions
aws ssm get-parameter \
  --name /aws/service/bottlerocket/aws-k8s-1.30/arm64/latest/image/release-version \
  --region us-west-2 \
  --query "Parameter.Value" \
  --output text
```

> :information_source: Update the `subnetSelectorTerms` and
`securityGroupSelectorTerms` in the `karpenter.yaml` file with the correct
values for your infrastructure.

```shell
kubectl apply --filename karpenter.yaml
```
