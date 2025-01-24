package ai.whylabs.songbird.monitor

import ai.whylabs.songbird.cache.CacheKeyGenerator
import ai.whylabs.songbird.cache.CacheKeyType
import ai.whylabs.songbird.cache.NullableJedisPool
import ai.whylabs.songbird.logging.JsonLogging
import jakarta.inject.Inject
import jakarta.inject.Singleton

@Singleton
class MonitorConfigUpdater @Inject constructor(
    private val jedisPool: NullableJedisPool,
    private val cacheKeyGenerator: CacheKeyGenerator,
) : JsonLogging {

    fun scheduleMonitorConfigUpdate(orgId: String, datasetId: String) {
        val keyId = "$orgId#$datasetId"
        try {
            jedisPool.get().resource.use { jedis ->
                jedis.set(
                    cacheKeyGenerator.getKey(CacheKeyType.MonitorConfigUpdate, keyId).toByteArray(),
                    System.currentTimeMillis().toString().toByteArray()
                )
            }
        } catch (e: Exception) {
            log.warn("Failed to schedule update for monitor config: {}. Exception: {}", keyId, e.message)
        }
    }

    fun clearMonitorConfigUpdate(orgId: String, datasetId: String) {
        val keyId = "$orgId#$datasetId"
        try {
            jedisPool.get().resource.use { jedis ->
                jedis.del(cacheKeyGenerator.getKey(CacheKeyType.MonitorConfigUpdate, keyId).toByteArray())
            }
        } catch (e: Exception) {
            log.warn("Failed to clear update for monitor config: {}. Exception: {}", keyId, e.message)
        }
    }
}
