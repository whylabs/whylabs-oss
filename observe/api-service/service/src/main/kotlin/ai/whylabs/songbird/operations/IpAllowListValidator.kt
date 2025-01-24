package ai.whylabs.songbird.operations

import ai.whylabs.songbird.EnvironmentConfig
import ai.whylabs.songbird.EnvironmentVariable
import ai.whylabs.songbird.logging.JsonLogging
import com.amazonaws.services.s3.AmazonS3
import com.google.common.cache.CacheBuilder
import com.google.common.cache.CacheLoader
import com.google.common.cache.LoadingCache
import com.google.gson.Gson
import io.swagger.v3.oas.annotations.media.Schema
import jakarta.inject.Inject
import jakarta.inject.Singleton
import org.apache.commons.net.util.SubnetUtils
import java.util.concurrent.TimeUnit

@Singleton
class IpAllowListValidator @Inject constructor(
    config: EnvironmentConfig,
    private val s3: AmazonS3,
) : JsonLogging {
    private val configPath = "configuration/ip-allowlist-configuration.json"
    private val bucket = config.getEnv(EnvironmentVariable.StorageBucket)
    private val cacheKey = "ip-allowlist-configuration"
    private val cachedConfiguration: LoadingCache<String, OrganizationIpAllowList?> =
        CacheBuilder.newBuilder()
            .expireAfterWrite(5, TimeUnit.MINUTES)
            .maximumSize(100)
            .build(
                CacheLoader.from { key: String ->
                    loadConfigurationFile()
                }
            )

    private fun loadConfigurationFile(): OrganizationIpAllowList? {
        return try {
            val content = s3.getObjectAsString(bucket, configPath)
            val config = Gson().fromJson(content, IpAllowListConfiguration::class.java)
            OrganizationIpAllowList(
                organizations = config.organizations.mapValues { (_, value) ->
                    value.cidr.map { SubnetUtils(it).info }
                }
            )
        } catch (e: Exception) {
            log.warn("Failed to load organization ip allowlist from s3", e)
            null
        }
    }

    fun loadCachedConfiguration(): IpAllowListConfiguration? {
        return cachedConfiguration.get(cacheKey)?.let {
            IpAllowListConfiguration(
                organizations = it.organizations.mapValues { (_, value) ->
                    IpAllowListOrganizationConfiguration(
                        cidr = value.map { it.cidrSignature }
                    )
                }
            )
        }
    }

    fun isAllowed(orgId: String?, ipAddress: String?): Boolean {
        if (ipAddress == null || orgId == null) {
            return true
        }
        val allowedSubnets = cachedConfiguration.get(cacheKey) ?: return true
        val valid = allowedSubnets.organizations[orgId]?.let { subnets ->
            subnets.any { subnetInfo ->
                subnetInfo.isInRange(ipAddress)
            }
        } ?: true // If orgId is not found in the allowlist, default to true
        return valid
    }
}

@Schema(description = "Configuration for IP allowlist rules")
data class IpAllowListConfiguration(
    val organizations: Map<String, IpAllowListOrganizationConfiguration>
)

@Schema(description = "Configuration for organization IP allowlist rules")
data class IpAllowListOrganizationConfiguration(
    val cidr: List<String>
)

data class OrganizationIpAllowList(
    val organizations: Map<String, List<SubnetUtils.SubnetInfo>>
)
