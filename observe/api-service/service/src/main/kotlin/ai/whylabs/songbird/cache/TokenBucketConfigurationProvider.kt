package ai.whylabs.songbird.cache

import ai.whylabs.songbird.EnvironmentConfig
import ai.whylabs.songbird.EnvironmentVariable
import ai.whylabs.songbird.logging.JsonLogging
import com.amazonaws.services.s3.AmazonS3
import com.google.common.base.Suppliers
import com.google.gson.Gson
import com.google.gson.annotations.SerializedName
import io.github.bucket4j.Bandwidth
import io.github.bucket4j.BucketConfiguration
import io.micronaut.http.HttpMethod
import jakarta.inject.Singleton
import java.net.URI
import java.time.Duration
import java.util.concurrent.TimeUnit
import java.util.function.Supplier

@Singleton
class TokenBucketConfigurationProvider(
    private val config: EnvironmentConfig,
    private val s3: AmazonS3,
) : JsonLogging {
    private val configPath = "configuration/token-bucket-configuration.json"
    private val cachedConfigurationFile = Suppliers.memoizeWithExpiration(this::loadConfigurationFile, 30, TimeUnit.MINUTES)
    private val defaultCapacity = cachedConfigurationFile.get()?.defaultBucketConfiguration?.capacity ?: 1000
    private val defaultRefillPerMinute = cachedConfigurationFile.get()?.defaultBucketConfiguration?.refillPerMinute ?: 5

    fun loadConfigurationFile(): TokenBucketConfiguration? {
        return try {
            val bucket = config.getEnv(EnvironmentVariable.StorageBucket)
            val content = s3.getObjectAsString(bucket, configPath)
            Gson().fromJson(content, TokenBucketConfiguration::class.java)
        } catch (e: Exception) {
            log.warn("Failed to load token bucket configuration from s3", e)
            null
        }
    }

    private fun createBucketConfiguration(capacity: Int, refillPerMinute: Int): Supplier<BucketConfiguration> {
        return Supplier {
            BucketConfiguration.builder()
                .addLimit(
                    Bandwidth.builder()
                        .capacity(capacity.toLong())
                        .refillGreedy(refillPerMinute.toLong(), Duration.ofSeconds(60))
                        .build()
                )
                .build()
        }
    }

    fun hasEndpointConfiguration(method: HttpMethod, endpoint: URI): Boolean {
        return cachedConfigurationFile.get()?.endpointConfiguration?.containsKey("${method.name}#${endpoint.path}") ?: false
    }

    fun resolveEndpointConfiguration(method: HttpMethod, endpoint: URI): Supplier<BucketConfiguration> {
        val config = cachedConfigurationFile.get()?.endpointConfiguration?.get("${method.name}#${endpoint.path}")
        return createBucketConfiguration(config?.capacity ?: defaultCapacity, config?.refillPerMinute ?: defaultRefillPerMinute)
    }

    fun resolveBucketConfiguration(orgId: String): Supplier<BucketConfiguration> {
        val capacity = cachedConfigurationFile.get()?.orgBucketConfiguration?.get(orgId)?.capacity ?: defaultCapacity
        val refillPerMinute = cachedConfigurationFile.get()?.orgBucketConfiguration?.get(orgId)?.refillPerMinute ?: defaultRefillPerMinute
        log.debug("Rate limit bucket configuration applied to orgId: $orgId, capacity: $capacity, refillPerMinute: $refillPerMinute")
        return createBucketConfiguration(capacity, refillPerMinute)
    }

    fun anonymousBucketConfiguration(): Supplier<BucketConfiguration> {
        val capacity = cachedConfigurationFile.get()?.anonymousBucketConfiguration?.capacity ?: defaultCapacity
        val refillPerMinute = cachedConfigurationFile.get()?.anonymousBucketConfiguration?.refillPerMinute ?: defaultRefillPerMinute
        log.debug("Rate limit bucket configuration applied to anonymous bucket capacity: $capacity, refillPerMinute: $refillPerMinute")
        return createBucketConfiguration(capacity, refillPerMinute)
    }
}

data class TokenBucketConfiguration(
    @SerializedName(value = "elasticache_hostname")
    val elastiCacheHostname: String?,
    @SerializedName(value = "elasticache_port")
    val elastiCachePort: Int?,
    @SerializedName(value = "default_bucket_configuration")
    val defaultBucketConfiguration: BucketConfigurationValue,
    @SerializedName(value = "anonymous_bucket_configuration")
    val anonymousBucketConfiguration: BucketConfigurationValue,
    @SerializedName(value = "org_bucket_configuration")
    val orgBucketConfiguration: Map<String, BucketConfigurationValue>,
    @SerializedName(value = "endpoint_configuration")
    val endpointConfiguration: Map<String, BucketConfigurationValue>?
)

data class BucketConfigurationValue(
    @SerializedName(value = "capacity")
    val capacity: Int,
    @SerializedName(value = "refill_per_minute")
    val refillPerMinute: Int
)
