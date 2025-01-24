package ai.whylabs.songbird.common

object WhyLabsHeaders {
    const val WhyLabsOrganizationHeader = "X-WHYLABS-ORGANIZATION"
    const val WhyLabsResourceHeader = "X-WHYLABS-RESOURCE"
    const val WhyLabsUserHeader = "X-WHYLABS-ID"
    const val WhyLabsFileExtensionHeader = "X-WHYLABS-FILE-EXTENSION"
    const val WhyLabsIdempotencyKeyHeader = "X-WHYLABS-IDEMPOTENCY-KEY"
    const val WhyLabsApiKeyHeader = "X-API-KEY"
    const val WhyLabsUserIPHeader = "X-WHYLABS-USER-IP"
    const val WhyLabsImpersonatorHeader = "X-WHYLABS-IMPERSONATOR"
}

object WhyLabsAttributes {
    const val RequestOrganizationId = "RequestOrganizationId"
    const val RequestUserId = "RequestUserId"
}
