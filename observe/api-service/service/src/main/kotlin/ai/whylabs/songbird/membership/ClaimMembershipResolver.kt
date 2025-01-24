package ai.whylabs.songbird.membership

import ai.whylabs.songbird.EnvironmentConfig
import ai.whylabs.songbird.EnvironmentVariable
import ai.whylabs.songbird.logging.JsonLogging
import ai.whylabs.songbird.v0.controllers.User
import com.amazonaws.services.s3.AmazonS3
import com.google.common.cache.CacheBuilder
import com.google.common.cache.CacheLoader
import com.google.common.cache.LoadingCache
import com.google.gson.Gson
import jakarta.inject.Inject
import jakarta.inject.Singleton
import java.util.concurrent.TimeUnit

@Singleton
class ClaimMembershipResolver @Inject constructor(
    config: EnvironmentConfig,
    private val s3: AmazonS3,
) : JsonLogging {
    private val configPath = "configuration/claim-membership-configuration.json"
    private val bucket = config.getEnv(EnvironmentVariable.StorageBucket)
    private val cacheKey = "claim-membership-configuration"
    private val cachedConfiguration: LoadingCache<String, ClaimMembershipConfiguration?> =
        CacheBuilder.newBuilder()
            .expireAfterWrite(5, TimeUnit.MINUTES)
            .maximumSize(100)
            .build(
                CacheLoader.from { key: String ->
                    loadConfigurationFile()
                }
            )

    private fun loadConfigurationFile(): ClaimMembershipConfiguration? {
        return try {
            val content = s3.getObjectAsString(bucket, configPath)
            Gson().fromJson(content, ClaimMembershipConfiguration::class.java)
        } catch (e: Exception) {
            log.warn("Failed to load token bucket configuration from s3", e)
            null
        }
    }

    fun getClaimMembershipConfiguration(): ClaimMembershipConfiguration {
        cachedConfiguration.invalidateAll()
        return cachedConfiguration.get(cacheKey) ?: ClaimMembershipConfiguration(connections = emptyMap())
    }

    fun getClaimMembershipRoleConfiguration(connection: String): ClaimMembershipRoleConfiguration {
        cachedConfiguration.invalidateAll()
        return cachedConfiguration.get(cacheKey)?.connections?.get(connection) ?: ClaimMembershipRoleConfiguration(memberships = emptyMap())
    }

    fun addClaimMembershipMapping(connectionName: String, group: String, memberships: List<ClaimConfigurationMembership>) {
        val configuration = getClaimMembershipConfiguration()
        val connections = configuration.connections.toMutableMap()
        val mapping = connections[connectionName]?.memberships?.toMutableMap() ?: mutableMapOf()
        val existingClaimMemberships = mapping[group] ?: emptyList()
        val combinedClaimMemberships = (memberships + existingClaimMemberships).toSet().toList()
        mapping[group] = combinedClaimMemberships
        connections.put(connectionName, ClaimMembershipRoleConfiguration(memberships = mapping))
        val updatedConfiguration = ClaimMembershipConfiguration(connections = connections)
        s3.putObject(bucket, configPath, Gson().toJson(updatedConfiguration))
    }

    fun deleteClaimMembershipMapping(connectionName: String, group: String) {
        val configuration = getClaimMembershipConfiguration()
        val connections = configuration.connections.toMutableMap()
        val mapping = connections[connectionName]?.memberships?.toMutableMap()
        mapping?.remove(group)
        if (mapping != null) {
            connections[connectionName] = ClaimMembershipRoleConfiguration(memberships = mapping)
        }
        val updatedConfiguration = ClaimMembershipConfiguration(connections = connections)
        s3.putObject(bucket, configPath, Gson().toJson(updatedConfiguration))
    }

    fun resolveClaimMembership(user: User, connectionName: String, roleMapping: List<String>): List<Membership> {
        log.info("Resolve claim membership for connection $connectionName with role mapping ${roleMapping.joinToString(separator = "; ")}")

        val config = cachedConfiguration.get(cacheKey) ?: return emptyList()
        val memberships = config.connections[connectionName]?.let { connectionConfig ->
            roleMapping.flatMap { role ->
                connectionConfig.memberships[role]?.map { claimConfig ->
                    log.debug("Resolved claim membership for user ${user.userId} with role ${claimConfig.role} in org ${claimConfig.orgId}")
                    Membership(
                        orgId = claimConfig.orgId,
                        default = false,
                        role = claimConfig.role,
                        userId = user.userId,
                        email = user.email,
                    )
                } ?: emptyList()
            }
        }?.toSet() // Remove duplicates

        // Users may have multiple memberships in the same organization with different roles. Use the role preference order to resolve the membership role to grant.
        val resolvedMemberships = memberships
            ?.groupBy { Pair(it.userId, it.orgId) }
            ?.mapNotNull { it.value.maxByOrNull { membership -> membership.role.preferenceOrder } }
            ?.toList()

        return resolvedMemberships ?: emptyList()
    }
}
