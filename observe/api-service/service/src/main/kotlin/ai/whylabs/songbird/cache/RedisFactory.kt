package ai.whylabs.songbird.cache

import ai.whylabs.songbird.EnvironmentConfig
import ai.whylabs.songbird.EnvironmentVariable
import ai.whylabs.songbird.logging.JsonLogging
import io.micronaut.context.annotation.Factory
import jakarta.inject.Singleton
import redis.clients.jedis.JedisPool
import redis.clients.jedis.JedisPoolConfig

@Factory
class RedisFactory : JsonLogging {

    @Singleton
    fun jedisPool(
        config: EnvironmentConfig,
        tokenBucketConfigurationProvider: TokenBucketConfigurationProvider,
    ): NullableJedisPool {
        return try {
            val configHostname = tokenBucketConfigurationProvider.loadConfigurationFile()?.elastiCacheHostname
            val configPort = tokenBucketConfigurationProvider.loadConfigurationFile()?.elastiCachePort

            val endpoint = configHostname ?: config.getEnv(EnvironmentVariable.ElastiCacheHostName)
            val port = configPort ?: config.getEnv(EnvironmentVariable.ElastiCachePort, "6379").toInt()
            val poolConfig = JedisPoolConfig()
            poolConfig.maxTotal = 128
            poolConfig.maxIdle = 128
            poolConfig.minIdle = 16
            poolConfig.testOnBorrow = true
            poolConfig.testOnReturn = true
            poolConfig.testWhileIdle = true
            val jedisPool = JedisPool(poolConfig, endpoint, port, true)
            jedisPool.resource.ping()
            NullableJedisPool(jedisPool)
        } catch (e: Throwable) {
            log.warn("Fail to launch UnifiedJedis. Exception: {}", e.message)
            NullableJedisPool()
        }
    }
}
