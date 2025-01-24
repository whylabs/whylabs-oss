package ai.whylabs.songbird.embeddings

import ai.whylabs.songbird.cache.ProcessedEmbeddingAssetCache
import ai.whylabs.songbird.logging.JsonLogging
import ai.whylabs.songbird.v0.dao.AssetMetadata
import ai.whylabs.songbird.v0.dao.AssetMetadataDAO
import ai.whylabs.songbird.v0.ddb.AssetMetadataItem
import com.amazonaws.services.dynamodbv2.model.AttributeValue
import com.amazonaws.services.dynamodbv2.model.ComparisonOperator
import com.amazonaws.services.dynamodbv2.model.Condition
import io.micronaut.scheduling.annotation.Scheduled
import jakarta.inject.Inject
import jakarta.inject.Singleton
import java.time.Instant
import java.time.ZoneOffset
import java.time.format.DateTimeFormatter

@Singleton
class EmbeddingAssetUpdateJob @Inject constructor(
    private val assetMetadataDAO: AssetMetadataDAO,
    private val embeddingAssetProcessor: EmbeddingAssetProcessor,
    private val processedEmbeddingAssetCache: ProcessedEmbeddingAssetCache,
) : JsonLogging {

    private fun cacheKey(assetMetadata: AssetMetadata): String {
        return "${assetMetadata.assetId}#${assetMetadata.tag}#${assetMetadata.version}"
    }

    @Scheduled(fixedDelay = "300s", initialDelay = "300s")
    fun scheduleUpdate() {
        update(overwrite = false, periodInSeconds = LookbackTimeSeconds.toLong())
    }

    fun update(overwrite: Boolean? = null, periodInSeconds: Long? = null) {
        try {
            val queryFilter = mutableMapOf<String, Condition>()
            queryFilter["uploaded"] to Condition()
                .withComparisonOperator(ComparisonOperator.NE)
                .withAttributeValueList(AttributeValue().withBOOL(false))
            val lookbackInstant = Instant.now().minusSeconds(periodInSeconds ?: LookbackTimeSeconds.toLong())
            val formattedTime = DateTimeFormatter.ISO_INSTANT.format(lookbackInstant.atZone(ZoneOffset.UTC))
            queryFilter["creation_time"] = Condition()
                .withComparisonOperator(ComparisonOperator.GT)
                .withAttributeValueList(AttributeValue().withS(formattedTime))
            assetMetadataDAO.query(
                AssetMetadataItem(orgId = "shared-assets", assetId = "data"),
                queryFilter = queryFilter,
            ).forEach {
                val key = cacheKey(it)
                if (overwrite == true || !processedEmbeddingAssetCache.exists(key)) {
                    embeddingAssetProcessor.process(it.tag, it.version, it.s3Uri, overwrite = overwrite ?: false)
                    processedEmbeddingAssetCache.add(key, System.currentTimeMillis().toString())
                }
            }
        } catch (e: Exception) {
            log.warn("Failed job to update new embedding asset. Exception: {}", e.message)
        }
    }

    companion object {
        private const val LookbackTimeSeconds = 86400
    }
}
