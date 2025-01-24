package ai.whylabs.songbird.monitor

import ai.whylabs.songbird.EnvironmentConfig
import ai.whylabs.songbird.EnvironmentVariable
import ai.whylabs.songbird.logging.JsonLogging
import ai.whylabs.songbird.util.DownloadType
import ai.whylabs.songbird.util.S3DownloadParams
import com.amazonaws.services.s3.AmazonS3
import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.dataformat.yaml.YAMLFactory
import jakarta.inject.Inject
import jakarta.inject.Singleton
import net.pwall.json.schema.JSONSchema
import java.io.BufferedReader
import java.io.InputStreamReader

interface SchemaProvider : JsonLogging {
    fun getSchema(): JSONSchema?
}

@Singleton
class LocalSchemaProvider : SchemaProvider {
    override fun getSchema(): JSONSchema? {
        return try {
            val schema = JSONSchema.parse(schemaContents())
            return schema
        } catch (e: Exception) {
            log.info("Unable to resolve LocalSchemaProvider: {}", e)
            null
        }
    }

    private fun schemaContents(): String {
        // Load monitor config json-schema
        return javaClass.getResourceAsStream("/monitor/schema.yml")
            .use { `in` ->
                BufferedReader(InputStreamReader(`in`)).use {
                    reader ->
                    ObjectMapper().writeValueAsString(ObjectMapper(YAMLFactory()).readValue(reader, Any::class.java))
                }
            }
    }
}

@Singleton
class S3SchemaProvider @Inject constructor(
    private val environmentConfig: EnvironmentConfig,
    private val s3: AmazonS3,
) : SchemaProvider {
    override fun getSchema(): JSONSchema? {
        return try {
            val schema = JSONSchema.parse(schemaContents())
            return schema
        } catch (e: Exception) {
            log.info("Unable to resolve S3SchemaProvider: {}", e)
            null
        }
    }

    private fun schemaContents(): String {
        val bucket = environmentConfig.getEnv(EnvironmentVariable.StorageBucket)

        val downloadParams = S3DownloadParams(
            bucket = bucket,
            key = "monitor-schema/schema.json",
            downloadType = DownloadType.MonitorSchema,
            logger = log,
        )
        return downloadParams.download(s3)
    }
}
