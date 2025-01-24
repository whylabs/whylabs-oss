package ai.whylabs.songbird.v0.controllers

import ai.whylabs.songbird.EnvironmentConfig
import ai.whylabs.songbird.EnvironmentVariable
import ai.whylabs.songbird.Stage
import ai.whylabs.songbird.cache.CacheKeyType
import ai.whylabs.songbird.cache.NullableJedisPool
import ai.whylabs.songbird.job.MonitorConfigValidatorJob
import ai.whylabs.songbird.job.S3Params
import ai.whylabs.songbird.logging.JsonLogging
import ai.whylabs.songbird.membership.ClaimConfigurationMembership
import ai.whylabs.songbird.membership.ClaimMembershipConfiguration
import ai.whylabs.songbird.membership.ClaimMembershipResolver
import ai.whylabs.songbird.membership.OrganizationMembershipHandler
import ai.whylabs.songbird.operations.IpAllowListConfiguration
import ai.whylabs.songbird.operations.IpAllowListValidator
import ai.whylabs.songbird.security.ApiKeyAuth
import ai.whylabs.songbird.security.SecurityValues
import ai.whylabs.songbird.security.WhyLabsInternal
import ai.whylabs.songbird.v0.dao.AccountUserDAO
import ai.whylabs.songbird.v0.dao.AuditLogsDAO
import ai.whylabs.songbird.v0.dao.OrganizationDAO
import ai.whylabs.songbird.v0.dao.UserDAO
import ai.whylabs.songbird.v0.ddb.AccountUserItem
import ai.whylabs.songbird.v0.ddb.UserItem
import ai.whylabs.songbird.v0.models.AuditContent
import ai.whylabs.songbird.v0.models.AuditLog
import io.micronaut.http.MediaType
import io.micronaut.http.annotation.Body
import io.micronaut.http.annotation.Controller
import io.micronaut.http.annotation.Delete
import io.micronaut.http.annotation.Get
import io.micronaut.http.annotation.Post
import io.micronaut.http.annotation.QueryValue
import io.micronaut.security.annotation.Secured
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.media.Schema
import io.swagger.v3.oas.annotations.security.SecurityRequirement
import io.swagger.v3.oas.annotations.tags.Tag
import io.swagger.v3.oas.annotations.tags.Tags
import jakarta.inject.Inject
import redis.clients.jedis.params.ScanParams
import kotlin.concurrent.thread

@SecurityRequirement(name = ApiKeyAuth)
@Controller("/v0/admin")
@WhyLabsInternal
@Tags(
    Tag(name = "Admin", description = "Endpoint for admin operations"),
    Tag(name = "Internal", description = "Internal API"),
)
@Secured(SecurityValues.WhyLabsAdministratorRole, SecurityValues.WhyLabsSystemRole)
class AdminController @Inject constructor(
    private val env: EnvironmentConfig,
    private val userDAO: UserDAO,
    private val accountUserDAO: AccountUserDAO,
    private val organizationDAO: OrganizationDAO,
    private val auditLogsDAO: AuditLogsDAO,
    private val membershipHandler: OrganizationMembershipHandler,
    private val monitorConfigValidatorJob: MonitorConfigValidatorJob,
    private val claimMembershipResolver: ClaimMembershipResolver,
    private val ipAllowListValidator: IpAllowListValidator,
    private val jedisPool: NullableJedisPool,
) : JsonLogging {

    @Operation(
        operationId = "GetIpAllowListConfiguration",
        summary = "Get IP allowlist configuration",
        description = "Get IP allowlist configuration",
    )
    @Get(
        uri = "/configuration/ip-allowlist",
        produces = [MediaType.APPLICATION_JSON]
    )
    fun getIpAllowListConfiguration(): IpAllowListConfiguration {
        return ipAllowListValidator.loadCachedConfiguration() ?: IpAllowListConfiguration(emptyMap())
    }

    @Operation(
        operationId = "ListCacheKeys",
        summary = "List cache keys",
        description = "List cache keys",
    )
    @Get(
        uri = "/cache/keys",
        produces = [MediaType.APPLICATION_JSON]
    )
    fun listCacheKeys(
        @QueryValue cache_key_type: CacheKeyType,
        @QueryValue pattern: String? = "*",
    ): List<String> {
        try {
            jedisPool.get().resource.use { jedis ->
                var cursor = "0"
                var iterations = 0
                val results = mutableListOf<String>()
                val prefix = "${cache_key_type.prefix}#${pattern ?: "*"}"
                do {
                    val scanResult = jedis.scan(cursor, ScanParams().match(prefix).count(200))
                    cursor = scanResult.cursor
                    results.addAll(scanResult.result.stream().toList())
                    iterations++
                } while (cursor != "0" && iterations < 10000 && results.size < 100)
                log.info("Completed flushing monitor config update cache with $iterations scan iterations.")

                return results
            }
        } catch (e: Exception) {
            log.warn("Unable to list cache keys. Exception: {}", e.message)
            return emptyList()
        }
    }

    @Operation(
        operationId = "DeleteCacheKey",
        summary = "Delete cache key",
        description = "Delete cache key",
    )
    @Delete(
        uri = "/cache/key",
        produces = [MediaType.APPLICATION_JSON]
    )
    fun deleteCacheKeys(
        @QueryValue key: String,
    ): Response {
        try {
            jedisPool.get().resource.use { jedis ->
                jedis.del(key)
            }
        } catch (e: Exception) {
            log.warn("Unable to delete cache keys. Exception: {}", e.message)
        }
        return Response()
    }

    @Operation(
        operationId = "AddAccountUsersFromMemberships",
        summary = "Adds account users for a managed organization and its child organizations based on existing memberships",
        description = "Adds account users for a managed organization its child organizations based on existing memberships",
    )
    @Post(
        uri = "/accounts/add-accounts-from-memberships",
        produces = [MediaType.APPLICATION_JSON]
    )
    fun addAccountUsersFromMemberships(
        @QueryValue org_id: String,
    ): List<String> {
        val organization = organizationDAO.getOrganization(org_id)
        if (organization.parentOrgId != null) {
            throw IllegalArgumentException("Organization is not a parent organization.")
        }
        val addedUsers = mutableSetOf<String>()
        val existingAccountUserIds = accountUserDAO.listForOrganization(orgId = org_id).map { it.userId }.toSet()
        val managedOrganizations = organizationDAO.listManagedOrganizations(org_id).map { it.toAccountOrganization() }
        val allOrganizations = listOf(organization.toAccountOrganization()) + managedOrganizations
        val orgMemberships = allOrganizations
            .asSequence()
            .map { membershipHandler.listOrganizationMemberships(it.orgId) }
            .flatten()
        orgMemberships.groupBy { it.userId }.forEach { (userId, _) ->
            if (userId in existingAccountUserIds) {
                return@forEach
            }
            val existingUser = userDAO.load(UserItem(userId = userId))
            if (existingUser == null) {
                log.warn("Unable to find user with id: {}", userId)
                return@forEach
            }
            val newAccountUser = AccountUserItem(
                orgId = org_id,
                email = existingUser.email,
                userId = existingUser.userId,
                active = true,
                deleted = false,
            )
            try {
                accountUserDAO.create(newAccountUser)
                addedUsers.add(newAccountUser.email)
            } catch (e: IllegalArgumentException) {
                log.warn("Unable to create account user for user: {}. Exception: {}", existingUser.userId, e.message)
            }
        }

        return addedUsers.toList()
    }

    @Operation(
        operationId = "GetClaimMembershipConfiguration",
        summary = "Get claim membership configuration",
        description = "Get claim membership configuration",
    )
    @Get(
        uri = "/membership/claim",
        produces = [MediaType.APPLICATION_JSON]
    )
    fun getClaimMembershipConfiguration(): ClaimMembershipConfiguration {
        return claimMembershipResolver.getClaimMembershipConfiguration()
    }

    @Operation(
        operationId = "AddClaimMembershipMapping",
        summary = "Add claim membership mapping",
        description = "Add claim membership mapping",
    )
    @Post(
        uri = "/membership/claim",
        produces = [MediaType.APPLICATION_JSON]
    )
    fun addClaimMembershipMapping(
        @QueryValue connection: String,
        @QueryValue group: String,
        @Body request: List<ClaimConfigurationMembership>
    ): Response {
        claimMembershipResolver.addClaimMembershipMapping(connection, group, request)
        return Response()
    }

    @Operation(
        operationId = "DeleteClaimMembershipMapping",
        summary = "Delete claim membership mapping",
        description = "Delete claim membership mapping",
    )
    @Delete(
        uri = "/membership/claim",
        produces = [MediaType.APPLICATION_JSON]
    )
    fun deleteClaimMembershipMapping(
        @QueryValue connection: String,
        @QueryValue group: String,
    ): Response {
        claimMembershipResolver.deleteClaimMembershipMapping(connection, group)
        return Response()
    }

    @Operation(
        operationId = "PostMonitorConfigValidationJob",
        summary = "Create a monitor config validation job for all configs",
        description = "Create a monitor config validation job for all configs",
    )
    @Post(
        uri = "/monitor-config/create-validation-job",
        produces = [MediaType.APPLICATION_JSON]
    )
    fun postMonitorConfigValidationJob(
        @QueryValue override_s3: Boolean = false,
        @QueryValue s3_bucket: String? = null,
    ) {
        if (override_s3) {
            val s3Params = fetchOverrideS3Credentials()
            thread {
                monitorConfigValidatorJob.execute(s3Params, s3_bucket)
            }
        } else {
            thread {
                monitorConfigValidatorJob.execute()
            }
        }
    }

    private fun fetchOverrideS3Credentials(): S3Params {
        validateCustomS3Endpoint()
        val accessKey = env.getEnv(EnvironmentVariable.LocalOverrideAWSAccessKey)
        val secretKey = env.getEnv(EnvironmentVariable.LocalOverrideAWSSecretKey)
        val region = env.getEnv(EnvironmentVariable.LocalOverrideAWSRegion)
        val sessionToken = env.getEnv(EnvironmentVariable.LocalOverrideAWSSessionToken)

        if (accessKey.isEmpty() || secretKey.isEmpty() || region.isEmpty() || sessionToken.isEmpty()) {
            throw IllegalArgumentException("Override S3 credentials must all be set.")
        }
        return S3Params(accessKey, secretKey, region, sessionToken)
    }

    private fun validateCustomS3Endpoint() {
        if (env.getStage() != Stage.Local) {
            throw IllegalArgumentException("This operation is only allowed in the local environment.")
        }
    }

    @Operation(
        operationId = "QueryAuditLogs",
        summary = "Query audit logs",
        description = "Query audit logs from BigQuery",
    )
    @Get(
        uri = "/audit-logs",
        produces = [MediaType.APPLICATION_JSON]
    )
    fun queryAuditLogs(
        @QueryValue org_id: String,
        @QueryValue start_date: String?,
        @QueryValue end_date: String?,
        @Schema(required = false) @QueryValue limit: Long? = 100,
        @Schema(required = false) @QueryValue offset: Long? = 0,
        @QueryValue event_name: String?,
        @QueryValue status_code: String?,
        @QueryValue principal_id: String?,
        @QueryValue identity_id: String?

    ): List<AuditLog> {
        if (limit != null && limit >= 1000) {
            throw IllegalArgumentException("Limit can't be over 1000 for this operation. Use the export endpoint instead.")
        }
        return auditLogsDAO.query(org_id, start_date, end_date, limit, offset, event_name, status_code, principal_id, identity_id).toList()
    }

    @Operation(
        operationId = "FetchAuditContent",
        summary = "Fetch audit content",
        description = "Fetch audit content from BigQuery",
    )
    @Get(
        uri = "/audit-content",
        produces = [MediaType.APPLICATION_JSON]
    )
    fun fetchAuditContent(
        @QueryValue message_id: String,
        @QueryValue publish_date: String,
    ): AuditContent {
        return auditLogsDAO.fetchContentByMessageId(message_id, publish_date)
    }
}
