package ai.whylabs.songbird.embeddings

import ai.whylabs.songbird.EnvironmentConfig
import ai.whylabs.songbird.EnvironmentVariable
import ai.whylabs.songbird.cache.EmbeddingTextCache
import ai.whylabs.songbird.logging.JsonLogging
import ai.whylabs.songbird.v1.controllers.EmbeddingDataEntry
import ai.whylabs.songbird.v1.controllers.VizEmbeddingDataEntry
import com.amazonaws.services.s3.AmazonS3
import com.amazonaws.services.s3.AmazonS3URI
import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import com.google.gson.Gson
import com.nimbusds.jose.util.StandardCharset
import jakarta.inject.Singleton
import java.util.zip.ZipInputStream

@Singleton
class EmbeddingAssetProcessor(
    config: EnvironmentConfig,
    private val s3: AmazonS3,
    private val embeddingTextCache: EmbeddingTextCache,
) : JsonLogging {
    private val defaultBucket = config.getEnv(EnvironmentVariable.StorageBucket)

    private fun processedDataPath(tag: String, version: String) = "embeddings/processed/$tag/$version/by_dataset.json"

    fun process(tag: String, version: String, s3Uri: String, overwrite: Boolean = false) {
        val isAlreadyProcessed = s3.doesObjectExist(defaultBucket, processedDataPath(tag, version))
        if (isAlreadyProcessed && !overwrite) {
            log.info("Embedding data for tag $tag version $version is already processed")
            return
        }

        val uri = AmazonS3URI(s3Uri)
        val inputStream = s3.getObject(uri.bucket, uri.key).objectContent
        val zipInputStream = ZipInputStream(inputStream)
        var entry = zipInputStream.nextEntry
        var maxEntriesToSearch = 5
        while (entry != null && maxEntriesToSearch-- > 0) {
            if (entry.name != "metadata.json") { // skip metadata file
                log.info("Processing raw embedding data from file ${entry.name} for tag $tag version $version")
                val rawEmbeddingData = String(zipInputStream.readAllBytes(), StandardCharset.UTF_8)
                val embeddings = rawEmbeddingData.lines().map { Gson().fromJson(it, EmbeddingDataEntry::class.java) }
                val grouped = embeddings
                    .filterNot { it?.dataset == null }
                    .groupBy { it.dataset!! }
                val processedDataset = grouped.mapValues { (_, value) ->
                    value.forEach { // populate redis for embeddings text
                        it.text?.let { text ->
                            if (it.uid != null) {
                                embeddingTextCache.add(it.uid, text)
                            }
                        }
                    }
                    val sample = value.shuffled().take(MaxSampleSize.coerceAtMost(value.size)) // sample each dataset by a random 1000 points
                    val x = mutableListOf<Double>()
                    val y = mutableListOf<Double>()
                    val z = mutableListOf<Double>()
                    val text = mutableListOf<String>()
                    val uid = mutableListOf<String>()
                    sample.forEach {
                        x.add(it.coordinates[0])
                        y.add(it.coordinates[1])
                        z.add(it.coordinates[2])
                        text.add(it.text ?: "")
                        uid.add(it.uid ?: "")
                    }
                    VizEmbeddingDataEntry(text = text, x = x, y = y, z = z, uid = uid)
                }
                val processedDatasetString = jacksonObjectMapper().writeValueAsString(processedDataset)
                s3.putObject(defaultBucket, processedDataPath(tag, version), processedDatasetString)
                break
            }
            entry = zipInputStream.nextEntry
        }
    }

    companion object {
        private const val MaxSampleSize = 1000
    }
}
