package ai.whylabs.songbird.cache

import ai.whylabs.songbird.logging.JsonLogging
import jakarta.inject.Inject

abstract class GenericCache @Inject constructor(
    private val jedisPool: NullableJedisPool,
    private val cacheKeyGenerator: CacheKeyGenerator,
) : JsonLogging {
    abstract fun cacheType(): CacheKeyType

    open fun add(identifier: String, value: ByteArray) {
        try {
            jedisPool.get().resource.use { jedis ->
                jedis.set(cacheKeyGenerator.getKey(cacheType(), identifier).toByteArray(), value)
            }
        } catch (e: Exception) {
            log.warn("Failed to add cache item type: {} id: {}. Exception: {}", cacheType(), identifier, e.message)
        }
    }

    fun get(identifier: String): ByteArray? {
        try {
            return jedisPool.get().resource.use { jedis ->
                jedis.get(cacheKeyGenerator.getKey(cacheType(), identifier).toByteArray())
            }
        } catch (e: Exception) {
            log.warn("Failed get cache item for type: {} id: {}. Exception: {}", cacheType(), identifier, e.message)
            return null
        }
    }

    fun exists(identifier: String): Boolean {
        try {
            return jedisPool.get().resource.use { jedis ->
                jedis.exists(cacheKeyGenerator.getKey(cacheType(), identifier))
            }
        } catch (e: Exception) {
            log.warn("Failed exists check for cache item for type: {} id: {}. Exception: {}", cacheType(), identifier, e.message)
            return false
        }
    }
}
