package ai.whylabs.songbird.cache

import ai.whylabs.songbird.common.WhyLabsAttributes
import ai.whylabs.songbird.logging.JsonLogging
import ai.whylabs.songbird.operations.getRequestAttribute
import io.github.bucket4j.distributed.BucketProxy
import io.github.bucket4j.distributed.ExpirationAfterWriteStrategy
import io.github.bucket4j.redis.jedis.cas.JedisBasedProxyManager
import io.micronaut.http.HttpRequest
import io.micronaut.http.server.util.HttpClientAddressResolver
import jakarta.inject.Inject
import jakarta.inject.Singleton
import java.lang.IllegalStateException
import java.time.Duration

@Singleton
class TokenBucketProvider @Inject constructor(
    private val tokenBucketConfigurationProvider: TokenBucketConfigurationProvider,
    private val cacheKeyGenerator: CacheKeyGenerator,
    private val httpClientAddressResolver: HttpClientAddressResolver,
    jedisPool: NullableJedisPool,
) : JsonLogging {

    private val proxy = try {
        JedisBasedProxyManager.builderFor(jedisPool.pool)
            .withExpirationStrategy(
                ExpirationAfterWriteStrategy.basedOnTimeForRefillingBucketUpToMax(
                    (Duration.ofHours(24))
                )
            )
            .build()
    } catch (e: Throwable) {
        log.warn("Failed to launch JedisBasedProxyManager. Exception: {}", e.message)
        null
    }

    fun enabled(): Boolean = proxy != null

    fun getBucketProxy(request: HttpRequest<*>): BucketProxy {
        val orgId = getRequestAttribute(WhyLabsAttributes.RequestOrganizationId)?.toString()
        val ipAddressHeader = request.headers["X-Forwarded-For"] ?: httpClientAddressResolver.resolve(request)
        val ipAddress = ipAddressHeader.split(",").firstOrNull()?.trim() ?: "unknown-source-ip"
        log.debug("Rate limit bucketing for orgId: $orgId, ipAddress: $ipAddress")

        val (cacheKey, bucketConfig) = if (orgId != null) {
            if (tokenBucketConfigurationProvider.hasEndpointConfiguration(request.method, request.uri)) {
                cacheKeyGenerator.getKey(
                    CacheKeyType.RateLimitBucket,
                    "$orgId:${request.method.name}:${request.uri.path}"
                ) to tokenBucketConfigurationProvider.resolveEndpointConfiguration(request.method, request.uri)
            } else {
                cacheKeyGenerator.getKey(
                    CacheKeyType.RateLimitBucket,
                    orgId
                ) to tokenBucketConfigurationProvider.resolveBucketConfiguration(orgId)
            }
        } else {
            log.debug("Anonymous request rate limit configuration applied to ip address: {}", ipAddress)
            cacheKeyGenerator.getKey(CacheKeyType.RateLimitBucket, ipAddress) to tokenBucketConfigurationProvider.anonymousBucketConfiguration()
        }

        return proxy?.builder()?.build(cacheKey.toByteArray(), bucketConfig)
            ?: throw IllegalStateException("Proxy not configured")
    }
}
