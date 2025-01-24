package ai.whylabs.songbird.util

class DocUtils {
    companion object {
        // prefix all URIs with organization. This will enable us to quickly filter out API keys that don't
        // match the organization ID
        const val OrganizationUri = "organizations/{org_id}"
        const val ExampleStartMilli = "1577836800000" // 2020/01/01
        const val ExampleSegmentJson =
            """[{"key": "string", "value": "string" }]"""
        const val ExampleEndMilli = "1893456000000" // 2030/01/01
        const val ExampleTimePeriod = "P1D"
        const val ExampleModelType = "CLASSIFICATION"
        const val ExampleOrgId = "org-123"
        const val ExampleModelId = "model-123"
        const val ExampleDatasetId = "model-123"
        const val ExampleAssetId = "asset-123"
        const val ExampleColumnId = "feature-123"
        const val ExampleMetricName = "estimated_performance_median"
        const val ExampleMonitorId = "drift-monitor-123"
        const val ExampleRole = "ADMIN"
        const val ExampleReferenceId = "4920545486e2a4cdf0f770c09748e663"
        const val ExampleAnalyzerId = "drift-analyzer"
        const val ExampleNotificationActionType = "EMAIL"
        const val ExampleNotificationActionId = "user-action"
        const val ExampleUserId = "user-123"
        const val ExampleKeyId = "fh4dUNV3WQ"
        const val ExampleOrgName = "ACME, Inc"
        const val ExampleSubscriptionTier = "FREE"
        const val ExampleEmail = "user@whylabs.ai"
        const val ExampleDomain = "acme.ai"
        const val ExampleDomains = "acme.ai,acme.com"
        const val ExampleNotificationEmail = "notifications@acme.ai"
        const val ExampleSlackWebhook = "https://hooks.slack.com/services/foo/bar"
        const val ExamplePagerDutyKey = "abc-def-ghi-jkl"
        const val ExampleObservatoryUrl = "https://hub.whylabsapp.com"
        const val ExampleModelName = "Credit-Score-1"
        const val ExampleLogId = "log-Zc9EeWkyG3RcvBNj"
        const val ExampleAPIKeyAlias = "MLApplicationName"
        const val ExampleAPIKeyID = "HMiFAgQeNb"
        const val ExampleTraceId = "a756f8bb-de30-48a2-be41-178ae6af7100"
        const val ExampleTransactionId = "28541e19-72c2-4c43-bbce-84e4de362101"
        const val ExampleInterval = "2024-01-01T00:00:00Z/2024-01-12T00:00:00Z"
    }
}
