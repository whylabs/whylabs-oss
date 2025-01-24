package ai.whylabs.songbird.v1.controllers

import ai.whylabs.songbird.common.WhyLabsAttributes
import ai.whylabs.songbird.logging.JsonLogging
import ai.whylabs.songbird.operations.AuditableRequestBody
import ai.whylabs.songbird.operations.AuditableResponseBody
import ai.whylabs.songbird.operations.getValidatedIdentity
import ai.whylabs.songbird.security.ApiKeyAuth
import ai.whylabs.songbird.security.AuthenticationToken
import ai.whylabs.songbird.security.AuthenticationTokenMetadata
import ai.whylabs.songbird.security.SecurityValues.AccountAdministratorRole
import ai.whylabs.songbird.security.SecurityValues.AdministratorRole
import ai.whylabs.songbird.security.SecurityValues.AuthenticatedRole
import ai.whylabs.songbird.security.SecurityValues.SupportedExternalApiScopes
import ai.whylabs.songbird.util.DocUtils
import ai.whylabs.songbird.v0.controllers.Response
import ai.whylabs.songbird.v0.dao.ApiKeyDAO
import ai.whylabs.songbird.v0.dao.ApiKeyDAO2
import ai.whylabs.songbird.v0.dao.ApiKeyItem
import ai.whylabs.songbird.v0.dao.ListUserApiKeys
import ai.whylabs.songbird.v0.dao.ModelDAO
import ai.whylabs.songbird.v0.dao.OrganizationDAO
import ai.whylabs.songbird.v0.dao.UserApiKey
import ai.whylabs.songbird.v0.ddb.OrgKey
import io.micronaut.http.MediaType
import io.micronaut.http.annotation.Controller
import io.micronaut.http.annotation.Delete
import io.micronaut.http.annotation.Get
import io.micronaut.http.annotation.Post
import io.micronaut.http.annotation.QueryValue
import io.micronaut.http.annotation.RequestAttribute
import io.micronaut.security.annotation.Secured
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.media.ArraySchema
import io.swagger.v3.oas.annotations.media.Content
import io.swagger.v3.oas.annotations.media.Schema
import io.swagger.v3.oas.annotations.responses.ApiResponse
import io.swagger.v3.oas.annotations.security.SecurityRequirement
import io.swagger.v3.oas.annotations.tags.Tag
import jakarta.inject.Inject
import java.time.Instant

@SecurityRequirement(name = ApiKeyAuth)
@Controller("/v1/api-key")
@Tag(name = "ApiKey", description = "API key management.")
@Secured(AccountAdministratorRole, AdministratorRole)
class ApiKeyController @Inject constructor(
    private val apiKeyDAO: ApiKeyDAO,
    private val apiKeyDAO2: ApiKeyDAO2,
    private val organizationDAO: OrganizationDAO,
    private val modelDAO: ModelDAO,
) : JsonLogging {

    @Operation(
        operationId = "ValidateApiKey",
        summary = "Validate API key access",
        description =
        """Returns the status code 200 if the API key is valid, 403 if the API key is invalid""",
    )
    @Get(
        uri = "/validate",
        produces = [MediaType.APPLICATION_JSON]
    )
    @Secured(AuthenticatedRole)
    fun validateApiKey(): Response {
        return Response()
    }

    @AuditableRequestBody
    @Operation(
        operationId = "GenerateApiKey",
        summary = "Generate an API key for a user.",
        description =
        """Generates an API key for a given user. Must be called either by system administrator or by the user themselves""",
    )
    @ApiResponse(
        description = "A object with key ID and other metadata about the key",
        content = [Content(schema = Schema(implementation = UserApiKey::class))],
    )
    @Post(
        uri = "/",
        consumes = [MediaType.APPLICATION_JSON],
        produces = [MediaType.APPLICATION_JSON]
    )
    suspend fun generateApiToken(
        @Schema(description = "WhyLabs OrgId", hidden = true, required = false)
        @RequestAttribute(WhyLabsAttributes.RequestOrganizationId) orgId: String,
        @Schema(example = DocUtils.ExampleStartMilli) @QueryValue expiration_time: Long? = null,
        @ArraySchema(
            schema = Schema(
                example = ":user",
                defaultValue = ":user"
            )
        ) @QueryValue scopes: Set<String>? = null,
        @Schema(example = DocUtils.ExampleModelId) @QueryValue resource_id: String? = null,
        @Schema(example = DocUtils.ExampleAPIKeyAlias) @QueryValue alias: String? = null,
    ): UserApiKey {
        if (expiration_time !== null && Instant.now().plusSeconds(60).isAfter(Instant.ofEpochMilli(expiration_time))) {
            throw IllegalArgumentException("Invalid expiration time")
        }

        if (resource_id != null) {
            modelDAO.getModel(orgId, resource_id)
        }

        val org = organizationDAO.getOrganization(orgId, refreshCacheEntry = true)
        if (!org.isPaidTier()) {
            throw IllegalArgumentException("Cannot create API keys for this organization. Please contact us to enable this feature.")
        }
        scopes?.forEach { scope ->
            if (!SupportedExternalApiScopes.contains(scope)) {
                throw IllegalArgumentException("Invalid scope provided: $scope")
            }
        }
        val userId = getValidatedIdentity()?.identityId ?: getValidatedIdentity()?.principalId ?: throw IllegalArgumentException("Invalid caller identity")

        log.info {
            msg("Generating API key")
            meta(
                "orgId" to orgId,
                "userId" to userId,
                "expirationTime" to expiration_time?.toString(),
                "scopes" to scopes?.toString(),
                "alias" to alias,
            )
        }

        val (apiKey, keyItem) = apiKeyDAO.newApiKey(orgId, userId, expiration_time, scopes, alias, resource_id)
        log.info("Created key with id ${keyItem.keyId} and hash ${keyItem.keyHash}")

        // Load the saved value back from ddb to return it to the caller. This ensures that the fields match exactly.
        // There was an issue where the creation time would lose some precision (in ms) after having been read from ddb as opposed
        // to the Date that we generated here such that `createKey(..).creationTime !== listKeys(..)[0].creationTime`

        val savedKey = apiKeyDAO2.load(ApiKeyItem(keyHash = keyItem.keyHash), consistentReads = true)
            ?: throw IllegalStateException("Couldn't look up key after creation using hash ${keyItem.keyHash}")

        log.info {
            msg("Generated API key")
            meta(
                "orgId" to orgId,
                "userId" to userId,
                "expirationTime" to expiration_time?.toString(),
                "keyId" to apiKey.keyId,
                "scopes" to scopes?.toString()
            )
        }

        val key = AuthenticationToken(token = apiKey.key, metadata = AuthenticationTokenMetadata(orgId = apiKey.orgId))

        return savedKey.copy(key = key.asString())
    }

    @AuditableResponseBody
    @Operation(
        operationId = "DeleteApiKey",
        summary = "Revoke the given API Key, removing its ability to access WhyLabs systems",
        description =
        """Revokes the given API Key""",
    )
    @Delete(
        uri = "/",
        produces = [MediaType.APPLICATION_JSON]
    )
    suspend fun deleteApiToken(
        @Schema(description = "WhyLabs OrgId", hidden = true, required = false)
        @RequestAttribute(WhyLabsAttributes.RequestOrganizationId) orgId: String,
        @Schema(example = DocUtils.ExampleAPIKeyID) @QueryValue key_id: String,
    ): UserApiKey {
        val userId = getValidatedIdentity()?.identityId ?: getValidatedIdentity()?.principalId ?: throw IllegalArgumentException("Invalid caller identity")
        log.info {
            msg("Revoking API key")
            meta(
                "orgId" to orgId,
                "userId" to userId,
                "keyId" to key_id,
            )
        }
        val revokedApiKey = apiKeyDAO.revokeApiKey(
            orgId = orgId,
            userId = userId,
            keyId = key_id,
        )

        log.info {
            msg("Revoked API key")
            meta(
                "orgId" to orgId,
                "userId" to userId,
                "keyId" to key_id,
            )
        }

        return revokedApiKey
    }

    @Operation(
        operationId = "ListApiKeyMetadata",
        summary = "List API key metadata for a given organization",
        description =
        """Returns the API key metadata for a given organization""",
    )
    @ApiResponse(
        description = "A list of objects with key ID and other metadata about the keys, but no secret values",
        content = [Content(schema = Schema(implementation = ListUserApiKeys::class))],
    )
    @Get(
        uri = "/",
        produces = [MediaType.APPLICATION_JSON]
    )
    fun listApiKeyMetadata(
        @Schema(description = "WhyLabs OrgId", hidden = true, required = false)
        @RequestAttribute(WhyLabsAttributes.RequestOrganizationId) orgId: String,
    ): DescribeApiKeys {
        val apiKeys = apiKeyDAO2.list(ApiKeyItem(orgKey = OrgKey(orgId)), ApiKeyItem.OrgIndex).filter { it.revoked != true }.toList()

        return DescribeApiKeys(apiKeys.map { it.toApiKeyMetadata() })
    }
}

@Schema(description = "Response for listing API key metadata", requiredProperties = ["items"])
data class DescribeApiKeys(
    val items: List<ApiKeyMetadata>,
)

@Schema(description = "Response for API Key metadata", requiredProperties = ["keyId", "orgId"])
data class ApiKeyMetadata(
    @field:Schema(
        description = "The key id. Can be used to identify api keys",
    )
    val keyId: String,
    @field:Schema(
        description = "The organization that the key belongs to",
    )
    val orgId: String,
    @field:Schema(
        description = "Expiration time in human readable format",
    )
    val expirationTime: String?,
    @field:Schema(
        description = "Scope of the key",
    )
    val scopes: Set<String>?,
    @field:Schema(
        description = "Human-readable alias for the key",
    )
    val alias: String?,
)

fun UserApiKey.toApiKeyMetadata(): ApiKeyMetadata {
    return ApiKeyMetadata(
        keyId = this.keyId,
        orgId = this.orgId,
        expirationTime = this.expirationTime,
        scopes = this.scopes,
        alias = this.alias,
    )
}
