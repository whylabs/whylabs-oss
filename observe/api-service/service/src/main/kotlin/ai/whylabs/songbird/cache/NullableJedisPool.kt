package ai.whylabs.songbird.cache

import redis.clients.jedis.JedisPool

data class NullableJedisPool(val pool: JedisPool? = null) {
    val isEmpty get() = pool == null
    fun get(): JedisPool = pool!!
}
