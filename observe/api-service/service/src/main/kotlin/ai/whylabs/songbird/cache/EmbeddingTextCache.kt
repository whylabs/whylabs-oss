package ai.whylabs.songbird.cache

import ai.whylabs.songbird.logging.JsonLogging
import jakarta.inject.Inject
import jakarta.inject.Singleton

@Singleton
class EmbeddingTextCache @Inject constructor(
    jedisPool: NullableJedisPool,
    cacheKeyGenerator: CacheKeyGenerator,
) : GenericCache(jedisPool, cacheKeyGenerator), JsonLogging {

    override fun cacheType(): CacheKeyType {
        return CacheKeyType.EmbeddingText
    }

    fun add(identifier: String, value: String) {
        super.add(identifier, value.toByteArray())
    }

    fun getText(identifier: String): String? {
        return super.get(identifier)?.let {
            return String(it)
        }
    }
}
