## Building

- Make sure you have docker buildx installed
- Here is the command to build for arm64 machines (replace it for `linux/amd64` if you want to build for x86 machines). Note that you can also build a multiarch build as well.

```
docker buildx build --platform linux/arm64 --output type=docker  -t whylabs-postgres . --progress=plain
```

This container is compatible with [CloudNative Postgres](https://cloudnative-pg.io/)