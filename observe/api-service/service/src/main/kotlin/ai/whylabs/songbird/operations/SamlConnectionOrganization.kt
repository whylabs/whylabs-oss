package ai.whylabs.songbird.operations

import ai.whylabs.songbird.EnvironmentConfig
import ai.whylabs.songbird.EnvironmentVariable
import ai.whylabs.songbird.logging.JsonLogging
import com.amazonaws.services.s3.AmazonS3
import com.google.common.cache.CacheBuilder
import com.google.common.cache.CacheLoader
import com.google.common.cache.LoadingCache
import com.google.gson.Gson
import jakarta.inject.Inject
import jakarta.inject.Singleton
import java.util.concurrent.TimeUnit

@Singleton
class SamlConnectionOrganization @Inject constructor(
    config: EnvironmentConfig,
    private val s3: AmazonS3,
) : JsonLogging {
    private val configPath = "configuration/saml-connection-organization.json"
    private val bucket = config.getEnv(EnvironmentVariable.StorageBucket)
    private val cacheKey = "saml-connection-organization"
    private val cachedConfiguration: LoadingCache<String, SamlConnectionOrganizationConfiguration?> =
        CacheBuilder.newBuilder()
            .expireAfterWrite(5, TimeUnit.MINUTES)
            .maximumSize(100)
            .build(
                CacheLoader.from { key: String ->
                    loadConfigurationFile()
                }
            )

    private fun loadConfigurationFile(): SamlConnectionOrganizationConfiguration? {
        return try {
            val content = s3.getObjectAsString(bucket, configPath)
            val config = Gson().fromJson(content, SamlConnectionOrganizationConfiguration::class.java)
            return config
        } catch (e: Exception) {
            log.warn("Failed to load saml connection organization configuration from s3", e)
            null
        }
    }

    fun isConnectionOwner(connection: String?, orgId: String?): Boolean {
        if (connection == null || orgId == null) {
            return false
        }
        val samlConnectionOwnership = cachedConfiguration.get(cacheKey) ?: return false
        samlConnectionOwnership.connections[connection]?.let { orgs ->
            return orgs.contains(orgId)
        }
        return false
    }
}

data class SamlConnectionOrganizationConfiguration(
    val connections: Map<String, List<String>>
)
