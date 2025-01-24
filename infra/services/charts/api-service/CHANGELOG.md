# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning]
(https://semver.org/spec/v2.0.0.html).

## [0.10.0] - 2024-10-31 :jack_o_lantern:

### Changed

- Removed `affinity` configuration from `values.yaml` file to remove defaults.
  Affinity configuration should now be specified during install/upgrade.

## [0.9.0] - 2024-10-29

### Added

- `schedulerName` to `values.yaml` file to support custom scheduling
- Default `podAntiAffinity` to prevent multiple instances of co-located on the
  same node

## [0.8.0] - 2024-10-17

### Added

- Default `DATADOG_METRICS_ENABLED: true` environment variable

## [0.7.0] - 2024-10-15

### Added

- `envFrom` block in `values.yaml` file and `deployment.yaml` to add environment
  variables from then content of secrets and configmaps

## [0.6.0] - 2024-09-04

### Added

- Updated `values.yaml` file to include `commitSha` for consistency across
  charts

### Changed

- Updated `image.tag`, `service.annotations`, `servicePrivate.annotations`,
  `podAnnotations`, and `podLabels` to support templates

## [0.5.0] - 2024-06-28

### Added

- Support for private `Service`

## [0.4.1] - 2024-06-26

### Fixed

- `extraVolumeMounts` bug in the `templates/deployment.yaml` prevented overrides
from the `values.yaml` file.

## [0.4.0] - 2024-05-28

### Added

- Pod disruption budget

### Changed

- `Service` includes an HTTPS port in addition to the HTTP port

## [0.3.0] - 2024-05-17

### Fixed

- truncate version labels when `appVersion` is longer than 63 characters

## [0.2.0] - 2024-05-17

### Changed

- default service type from `ClusterIp` to `LoadBalancer`
- `admission.datadoghq.com/enabled` location in template for better targeting
- make better use of helper `songbird.name` over `Chart.Name`

### Removed

- security contexts from pod/containers for deployment parity
- temp volume as it's not required without non-root security context

## [0.1.0] - 2024-05-16

### Added

- Initial release of the songbird Helm chart
