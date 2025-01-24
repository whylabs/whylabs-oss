package ai.whylabs.songbird.cache

import ai.whylabs.songbird.logging.JsonLogging
import ai.whylabs.songbird.v0.dao.ApiKeyDAO
import io.micronaut.scheduling.annotation.Scheduled
import jakarta.inject.Inject
import jakarta.inject.Singleton
import redis.clients.jedis.params.ScanParams
import redis.clients.jedis.params.ScanParams.SCAN_POINTER_START
import java.util.Date

@Singleton
class ApiKeyUsageCache @Inject constructor(
    private val jedisPool: NullableJedisPool,
    private val cacheKeyGenerator: CacheKeyGenerator,
    private val apiKeyDAO: ApiKeyDAO,
) : JsonLogging {

    @Scheduled(fixedDelay = "900s")
    fun flush() {
        try {
            val scanParams = ScanParams().count(200).match("${CacheKeyType.ApiKeyLastUsed.prefix}*")
            jedisPool.get().resource.use { jedis ->
                jedis.scan(SCAN_POINTER_START, scanParams).result.shuffled().take(25).forEach { result ->
                    val keyHash = result.split("#")[1]
                    val lastUsedTime = Date(jedis.get(result).toLong())
                    apiKeyDAO.updateLastUsed(keyHash, lastUsedTime)
                    jedis.del(result)
                }
            }
        } catch (e: Exception) {
            log.warn("Failed to flush api key update cache. Exception: {}", e.message)
        }
    }

    fun updateLastUsed(keyId: String) {
        try {
            jedisPool.get().resource.use { jedis ->
                jedis.set(
                    cacheKeyGenerator.getKey(CacheKeyType.ApiKeyLastUsed, keyId).toByteArray(),
                    System.currentTimeMillis().toString().toByteArray()
                )
            }
        } catch (e: Exception) {
            log.warn("Failed to update last used timestamp for keyId: {}. Exception: {}", keyId, e.message)
        }
    }
}
