package ai.whylabs.songbird.cache

import ai.whylabs.songbird.logging.JsonLogging
import jakarta.inject.Inject
import jakarta.inject.Singleton

@Singleton
class ProcessedEmbeddingAssetCache @Inject constructor(
    jedisPool: NullableJedisPool,
    cacheKeyGenerator: CacheKeyGenerator,
) : GenericCache(jedisPool, cacheKeyGenerator), JsonLogging {

    override fun cacheType(): CacheKeyType {
        return CacheKeyType.ProcessedEmbeddingAsset
    }

    fun add(identifier: String, value: String) {
        super.add(identifier, value.toByteArray())
    }
}
