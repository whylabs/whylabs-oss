package ai.whylabs.songbird.cache

import jakarta.inject.Singleton

@Singleton
class CacheKeyGenerator {
    fun getKey(type: CacheKeyType, key: String): String {
        return "${type.prefix}#$key"
    }
}

enum class CacheKeyType(val prefix: String) {
    RateLimitBucket("rate-limit-bucket"),
    ApiKeyLastUsed("api-key-last-used"),
    UserSessionRevoked("user-session-revoked"),
    IdempotencyKey("idempotency-key"),
    MonitorConfigUpdate("monitor-config-update"),
    EmbeddingText("embedding-text"),
    ProcessedEmbeddingAsset("processed-embedding-asset"),
}
