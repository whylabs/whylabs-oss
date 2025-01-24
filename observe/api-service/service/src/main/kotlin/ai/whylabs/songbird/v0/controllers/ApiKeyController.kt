package ai.whylabs.songbird.v0.controllers

import ai.whylabs.songbird.common.WhyLabsAttributes.RequestUserId
import ai.whylabs.songbird.logging.JsonLogging
import ai.whylabs.songbird.operations.AuditableResponseBody
import ai.whylabs.songbird.operations.setRequestAttribute
import ai.whylabs.songbird.security.ApiKeyAuth
import ai.whylabs.songbird.security.AuthenticationToken
import ai.whylabs.songbird.security.AuthenticationTokenMetadata
import ai.whylabs.songbird.security.SecurityValues.AllSupportedScopes
import ai.whylabs.songbird.security.SecurityValues.WhyLabsSystemRole
import ai.whylabs.songbird.security.WhyLabsInternal
import ai.whylabs.songbird.util.DocUtils
import ai.whylabs.songbird.v0.dao.ApiKeyDAO
import ai.whylabs.songbird.v0.dao.ApiKeyDAO2
import ai.whylabs.songbird.v0.dao.ApiKeyItem
import ai.whylabs.songbird.v0.dao.ListUserApiKeys
import ai.whylabs.songbird.v0.dao.OrganizationDAO
import ai.whylabs.songbird.v0.dao.UserApiKey
import ai.whylabs.songbird.v0.dao.UserApiKeyResponse
import ai.whylabs.songbird.v0.ddb.OrgKey
import ai.whylabs.songbird.v0.ddb.SubscriptionTier
import io.micronaut.http.MediaType
import io.micronaut.http.annotation.Controller
import io.micronaut.http.annotation.Delete
import io.micronaut.http.annotation.Get
import io.micronaut.http.annotation.Post
import io.micronaut.http.annotation.QueryValue
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

private const val MAX_KEYS_PER_ORG: Int = 25

@SecurityRequirement(name = ApiKeyAuth)
@Controller("/v0/${DocUtils.OrganizationUri}/api-key")
@Tag(name = "ApiKey", description = "API key management.")
@Secured(WhyLabsSystemRole)
class ApiKeyController @Inject constructor(
    private val apiKeyDAO: ApiKeyDAO,
    private val apiKeyDAO2: ApiKeyDAO2,
    private val organizationDAO: OrganizationDAO
) : JsonLogging {
    /**
     * @param org_id Your company's unique organization ID
     * @param user_id The unique user ID in an organization.
     * @param expiration_time Expiration time in epoch milliseconds
     * @param scopes Scopes of the token
     * @param alias A human-friendly name for the API Key
     * @returns An object with key ID and other metadata about the key
     */
    @Operation(
        operationId = "CreateApiKey",
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
    suspend fun createApiToken(
        @Schema(example = DocUtils.ExampleOrgId) org_id: String,
        @Schema(example = DocUtils.ExampleUserId) @QueryValue user_id: String,
        @Schema(example = DocUtils.ExampleStartMilli) @QueryValue expiration_time: Long? = null,
        @ArraySchema(
            schema = Schema(
                example = ":user",
                defaultValue = ":user"
            )
        ) @QueryValue scopes: Set<String>? = null,
        @Schema(example = DocUtils.ExampleAPIKeyAlias) @QueryValue alias: String? = null,
    ): UserApiKey {
        setRequestAttribute(RequestUserId, user_id)
        if (expiration_time !== null && Instant.now().plusSeconds(60).isAfter(Instant.ofEpochMilli(expiration_time))) {
            throw IllegalArgumentException("Invalid expiration time")
        }

        val org = organizationDAO.getOrganization(org_id, refreshCacheEntry = true)
        val count = {
            apiKeyDAO2.list(ApiKeyItem(orgKey = OrgKey(org_id)), ApiKeyItem.OrgIndex)
                .filter { it.revoked == false }
                .take(MAX_KEYS_PER_ORG)
                .count()
        }
        if (setOf(SubscriptionTier.FREE, null).contains(org.subscriptionTier) && count() >= MAX_KEYS_PER_ORG) {
            throw IllegalArgumentException("Key limit reached")
        }
        scopes?.forEach { scope ->
            if (!AllSupportedScopes.contains(scope)) {
                throw IllegalArgumentException("Invalid scope provided: $scope")
            }
        }

        log.info {
            msg("Generating API key")
            meta(
                "orgId" to org_id,
                "userId" to user_id,
                "expirationTime" to expiration_time?.toString(),
                "scopes" to scopes?.toString(),
                "alias" to alias,
            )
        }

        val (apiKey, keyItem) = apiKeyDAO.newApiKey(org_id, user_id, expiration_time, scopes, alias, resourceId = null)
        log.info("Created key with id ${keyItem.keyId} and hash ${keyItem.keyHash}")

        // Load the saved value back from ddb to return it to the caller. This ensures that the fields match exactly.
        // There was an issue where the creation time would lose some precision (in ms) after having been read from ddb as opposed
        // to the Date that we generated here such that `createKey(..).creationTime !== listKeys(..)[0].creationTime`

        val savedKey = apiKeyDAO2.load(ApiKeyItem(keyHash = keyItem.keyHash), consistentReads = true)
            ?: throw IllegalStateException("Couldn't look up key after creation using hash ${keyItem.keyHash}")

        log.info {
            msg("Generated API key")
            meta(
                "orgId" to org_id,
                "userId" to user_id,
                "expirationTime" to expiration_time?.toString(),
                "keyId" to apiKey.keyId,
                "scopes" to scopes?.toString()
            )
        }

        val key = AuthenticationToken(token = apiKey.key, metadata = AuthenticationTokenMetadata(orgId = apiKey.orgId))

        // Use the full API key structure with metadata suffix
        return savedKey.copy(key = key.asString())
    }

    @Operation(
        operationId = "GetApiKey",
        summary = "Get an api key by its id",
        description = "Get an api key by its id",
        tags = ["Internal"],
    )
    @ApiResponse(
        description = "An key metadata object but no secret values",
        content = [Content(schema = Schema(implementation = UserApiKeyResponse::class))],
    )
    @Get(
        uri = "/{key_id}",
        produces = [MediaType.APPLICATION_JSON]
    )
    @WhyLabsInternal
    suspend fun getApiKey(
        @Schema(example = DocUtils.ExampleOrgId) org_id: String,
        @Schema(example = DocUtils.ExampleKeyId) key_id: String
    ): UserApiKeyResponse {
        // TODO this is basically a convenience function over filtering down the listApiKeys api right now.
        // We need to make a new GSI that consists of ORG#KEY_ID before we can actually just do a direct lookup
        // of this information. Perf won't be an issue for a while so lets punt on this since this api isn't used
        // by external systems.
        val apiTokens = listApiTokens(org_id, null)
        return UserApiKeyResponse(apiTokens.items.firstOrNull { it.keyId == key_id })
    }

    /**
     * @param org_id Your company's unique organization ID
     * @param user_id The unique user ID in an organization.
     * @returns A list of objects with key ID and other metadata about the keys, but no secret values
     */
    @Operation(
        operationId = "ListApiKeys",
        summary = "List API key metadata for a given organization and user",
        description =
        """Returns the API key metadata for a given organization and user""",
        tags = ["Internal"],
    )
    @ApiResponse(
        description = "A list of objects with key ID and other metadata about the keys, but no secret values",
        content = [Content(schema = Schema(implementation = ListUserApiKeys::class))],
    )
    @Get(
        uri = "/",
        produces = [MediaType.APPLICATION_JSON]
    )
    suspend fun listApiTokens(
        @Schema(example = DocUtils.ExampleOrgId) org_id: String,
        @Schema(example = DocUtils.ExampleUserId, nullable = true) @QueryValue user_id: String?,
    ): ListUserApiKeys {
        log.info {
            msg("Fetching API key metadata")
            meta(
                "orgId" to org_id,
                "userId" to user_id,
            )
        }

        if (user_id == null) {
            val apiKeys = apiKeyDAO2.list(ApiKeyItem(orgKey = OrgKey(org_id)), ApiKeyItem.OrgIndex).filter { it.revoked != true }.toList()
            log.info {
                msg("Fetched API key metadata. Got ${apiKeys.size} items")
                meta("orgId" to org_id)
            }

            return ListUserApiKeys(apiKeys)
        } else {
            val apiKeys = apiKeyDAO.listApiKeys(orgId = org_id, userId = user_id)
            log.info {
                msg("Fetched API key metadata. Got ${apiKeys.items.size} items")
                meta("orgId" to org_id, "userId" to user_id)
            }

            return apiKeys
        }
    }

    /**
     * @param key_id ID of the key to revoke
     * @returns Metadata for the revoked API Key
     */
    @AuditableResponseBody
    @Operation(
        operationId = "RevokeApiKey",
        summary = "Revoke the given API Key, removing its ability to access WhyLabs systems",
        description =
        """Revokes the given API Key""",
    )
    @ApiResponse(
        description = "Revoked API Key's metadata",
        content = [Content(schema = Schema(implementation = UserApiKey::class))],
    )
    @Delete(
        uri = "/",
        produces = [MediaType.APPLICATION_JSON]
    )
    suspend fun revokeApiToken(
        @Schema(example = DocUtils.ExampleOrgId) org_id: String,
        @Schema(example = DocUtils.ExampleUserId) @QueryValue user_id: String,
        @Schema(example = DocUtils.ExampleAPIKeyID) @QueryValue key_id: String,
    ): UserApiKey {
        log.info {
            msg("Revoking API key")
            meta(
                "orgId" to org_id,
                "userId" to user_id,
                "keyId" to key_id,
            )
        }
        val revokedApiKey = apiKeyDAO.revokeApiKey(
            orgId = org_id,
            userId = user_id,
            keyId = key_id,
        )

        log.info {
            msg("Revoked API key")
            meta(
                "orgId" to org_id,
                "userId" to user_id,
                "keyId" to key_id,
            )
        }

        return revokedApiKey
    }
}
