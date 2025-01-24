package ai.whylabs.songbird.v0.controllers

import ai.whylabs.songbird.logging.JsonLogging
import ai.whylabs.songbird.operations.FeatureFlagClient
import ai.whylabs.songbird.operations.FeatureFlags
import ai.whylabs.songbird.security.ApiKeyAuth
import ai.whylabs.songbird.security.SecurityValues
import ai.whylabs.songbird.security.WhyLabsInternal
import io.micronaut.http.MediaType
import io.micronaut.http.annotation.Controller
import io.micronaut.http.annotation.Get
import io.micronaut.http.annotation.QueryValue
import io.micronaut.security.annotation.Secured
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.security.SecurityRequirement
import io.swagger.v3.oas.annotations.tags.Tag
import io.swagger.v3.oas.annotations.tags.Tags
import jakarta.inject.Inject

@SecurityRequirement(name = ApiKeyAuth)
@Controller("/v0/feature-flags")
@WhyLabsInternal
@Tags(
    Tag(name = "FeatureFlags", description = "Endpoint for feature flags"),
    Tag(name = "Internal", description = "Internal API"),
)
@Secured(SecurityValues.WhyLabsAdministratorRole, SecurityValues.WhyLabsSystemRole)
class FeatureFlagsController @Inject constructor(
    private val flagsClient: FeatureFlagClient,
) : JsonLogging {
    private suspend fun getAllFlags(userId: String, orgId: String, lite: Boolean): FeatureFlags {
        log.debug("Fetching ${if (lite) "lite" else ""} feature flags for user $userId in org $orgId")

        val flags = flagsClient.getAllFlags(userId = userId, orgId = orgId, lite)
        return flags
    }

    @Operation(
        operationId = "GetFeatureFlags",
        summary = "Get feature flags for the specified user/org",
        description = "Get feature flags for the specified user/org",
    )
    @Get(
        uri = "/",
        produces = [MediaType.APPLICATION_JSON]
    )
    suspend fun getFeatureFlags(@QueryValue user_id: String, @QueryValue org_id: String): FeatureFlags {
        return getAllFlags(userId = user_id, orgId = org_id, lite = false)
    }

    @Operation(
        operationId = "GetLiteFeatureFlags",
        summary = "Get feature flags for the specified userId/orgId by id only",
        description = "Get feature flags for the specified userId/orgId. Use for temporary features particularly back-end where we arent typically flagging by user",
    )
    @Get(
        uri = "/lite",
        produces = [MediaType.APPLICATION_JSON]
    )
    suspend fun getLiteFeatureFlags(@QueryValue user_id: String, @QueryValue org_id: String): FeatureFlags {
        return getAllFlags(userId = user_id, orgId = org_id, lite = true)
    }
}
