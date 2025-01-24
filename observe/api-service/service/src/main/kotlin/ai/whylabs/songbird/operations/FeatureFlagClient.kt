package ai.whylabs.songbird.operations

import ai.whylabs.songbird.EnvironmentConfig
import ai.whylabs.songbird.logging.JsonLogging
import io.swagger.v3.oas.annotations.media.Schema
import jakarta.inject.Inject
import jakarta.inject.Singleton

@Singleton
class FeatureFlagClient @Inject constructor(
    private val config: EnvironmentConfig,
) : JsonLogging {
    /**
     * Evaluates the state of the given flag globally (for all users)
     */
    fun hasGlobalFlag(flag: FeatureFlag): Boolean {
        return getAllFlags("", "").flagValues[flag.key] ?: false
    }

    /**
     * Returns the state of all feature flags for the given user/org ID
     */
    fun getAllFlags(userId: String, orgId: String, lite: Boolean = false): FeatureFlags {
        return FeatureFlags(
            mapOf(
                FeatureFlag.REDIS_RATE_LIMITING.key to true,
                FeatureFlag.API_IP_ALLOWLIST.key to false,
            )
        )
    }
}

enum class FeatureFlag(val key: String) {
    REDIS_RATE_LIMITING("songbird-api-redis-rate-limiting"),
    API_IP_ALLOWLIST("api-ip-allow-list"),
}

class FeatureUnauthorizedException(s: String) : RuntimeException(s)

@Schema(description = "Feature flag state")
data class FeatureFlags(
    @field:Schema(description = "The state of feature flags")
    val flagValues: Map<String, Boolean>,
)
