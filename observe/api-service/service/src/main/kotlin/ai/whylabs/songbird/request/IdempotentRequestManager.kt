package ai.whylabs.songbird.request

import ai.whylabs.songbird.cache.CacheKeyGenerator
import ai.whylabs.songbird.cache.CacheKeyType
import ai.whylabs.songbird.cache.NullableJedisPool
import ai.whylabs.songbird.logging.JsonLogging
import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import jakarta.inject.Inject
import jakarta.inject.Singleton

@Singleton
class IdempotentRequestManager @Inject constructor(
    private val jedisPool: NullableJedisPool,
    private val cacheKeyGenerator: CacheKeyGenerator,
) : JsonLogging {

    fun isIdempotentRequest(idempotencyKey: String?): Boolean {
        if (!idempotencyKey.isNullOrEmpty() && !jedisPool.isEmpty) {
            val cacheKey = cacheKeyGenerator.getKey(CacheKeyType.IdempotencyKey, idempotencyKey)
            if (jedisPool.get().resource.use { jedis -> jedis.exists(cacheKey) }) {
                return false
            }
        }
        return true
    }

    fun setIdempotentRequestProperties(idempotencyKey: String, keyAttributes: IdempotencyKeyAttributes) {
        try {
            if (!jedisPool.isEmpty) {
                val jsonKeyAttributes = jacksonObjectMapper().writeValueAsString(keyAttributes)
                val cacheKey =
                    cacheKeyGenerator.getKey(CacheKeyType.IdempotencyKey, idempotencyKey).toByteArray()
                jedisPool.get().resource.use { jedis ->
                    jedis.set(cacheKey, jsonKeyAttributes.toByteArray())
                    jedis.expire(cacheKey, 60 * 60 * 24 * 2) // 2 days
                }
            }
        } catch (e: Exception) {
            log.warn("Failed to store idempotency key: {}. Exception: {}", idempotencyKey, e.message)
        }
    }
}
