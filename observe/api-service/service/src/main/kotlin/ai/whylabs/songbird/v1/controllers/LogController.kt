package ai.whylabs.songbird.v1.controllers

import ai.whylabs.songbird.EnvironmentConfig
import ai.whylabs.songbird.EnvironmentVariable
import ai.whylabs.songbird.common.WhyLabsAttributes.RequestOrganizationId
import ai.whylabs.songbird.common.WhyLabsHeaders.WhyLabsFileExtensionHeader
import ai.whylabs.songbird.common.WhyLabsHeaders.WhyLabsIdempotencyKeyHeader
import ai.whylabs.songbird.common.WhyLabsHeaders.WhyLabsResourceHeader
import ai.whylabs.songbird.logging.JsonLogging
import ai.whylabs.songbird.operations.AuditableResponseBody
import ai.whylabs.songbird.operations.getValidatedIdentity
import ai.whylabs.songbird.request.IdempotencyKeyAttributes
import ai.whylabs.songbird.request.IdempotentRequestManager
import ai.whylabs.songbird.security.ApiKeyAuth
import ai.whylabs.songbird.security.SecurityValues
import ai.whylabs.songbird.security.SecurityValues.AdministratorRole
import ai.whylabs.songbird.security.SecurityValues.UserRole
import ai.whylabs.songbird.security.SecurityValues.WriteDataRole
import ai.whylabs.songbird.security.ValidatedIdentity
import ai.whylabs.songbird.security.getKey
import ai.whylabs.songbird.subscription.SubscriptionValidator
import ai.whylabs.songbird.util.LogUtil
import ai.whylabs.songbird.util.OrgUtils
import ai.whylabs.songbird.v0.controllers.AsyncLogResponse
import ai.whylabs.songbird.v0.controllers.LogAsyncRequest
import ai.whylabs.songbird.v0.controllers.WhyLabsFileExtension
import ai.whylabs.songbird.v0.dao.ModelDAO
import ai.whylabs.songbird.v0.dao.OrganizationDAO
import ai.whylabs.songbird.v0.ddb.SubscriptionTier
import ai.whylabs.songbird.v0.models.Segment
import io.micrometer.core.lang.Nullable
import io.micronaut.http.MediaType
import io.micronaut.http.annotation.Body
import io.micronaut.http.annotation.Controller
import io.micronaut.http.annotation.Header
import io.micronaut.http.annotation.Post
import io.micronaut.http.annotation.RequestAttribute
import io.micronaut.security.annotation.Secured
import io.micronaut.security.authentication.Authentication
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.media.Schema
import io.swagger.v3.oas.annotations.security.SecurityRequirement
import io.swagger.v3.oas.annotations.tags.Tag
import io.swagger.v3.oas.annotations.tags.Tags
import jakarta.inject.Inject

@SecurityRequirement(name = ApiKeyAuth)
@Controller("/v1/log")
@Tags(
    Tag(name = "Log", description = "Endpoint for logging dataset profiles"),
)
@Secured(SecurityValues.WhyLabsAdministratorRole)
class LogController @Inject constructor(
    private val config: EnvironmentConfig,
    private val modelDAO: ModelDAO,
    private val organizationDAO: OrganizationDAO,
    private val subscriptionValidator: SubscriptionValidator,
    private val idempotentRequestManager: IdempotentRequestManager,
    private val logUtil: LogUtil,
    private val orgUtils: OrgUtils,
) : JsonLogging {
    @AuditableResponseBody
    @Operation(
        operationId = "LogProfile",
        summary = "It returns an upload link that can be used to upload the profile to.",
        description = "It returns an upload link that can be used to upload the profile to.",
    )
    @Post(
        uri = "/async",
        consumes = [MediaType.APPLICATION_JSON],
        produces = [MediaType.APPLICATION_JSON]
    )
    @Secured(AdministratorRole, UserRole, WriteDataRole)
    suspend fun logProfile(
        @Schema(description = "WhyLabs resource ID", example = "resource-1")
        @Header(WhyLabsResourceHeader) resourceId: String?,
        @Schema(description = "WhyLabs OrgId", hidden = true, required = false)
        @RequestAttribute(RequestOrganizationId) orgId: String,
        @Schema(hidden = true, required = false)
        @Header(WhyLabsIdempotencyKeyHeader) idempotency_key: String?,
        @Schema(hidden = true, required = false)
        @Header(WhyLabsFileExtensionHeader) file_extension: String?,
        @Body body: LogAsyncRequest,
        @Nullable authentication: Authentication,
    ): AsyncLogResponse {
        if (!idempotentRequestManager.isIdempotentRequest(idempotency_key)) {
            log.warn("Failed Idempotent request. Idempotency key: $idempotency_key")
            throw IllegalArgumentException("Failed Idempotent request. Idempotency key: $idempotency_key")
        }
        if (resourceId == null) {
            throw IllegalArgumentException("Missing required header: $WhyLabsResourceHeader")
        }
        if (getValidatedIdentity()?.allowed(resourceId) == false) {
            throw IllegalArgumentException("Log for this resource is not allowed for this authentication.")
        }
        if (config.getEnv(EnvironmentVariable.KTLOMode, "false") == "true" && orgUtils.cachedOrgSubscriptionTier(orgId) == SubscriptionTier.FREE) {
            throw IllegalArgumentException("This operation is not allowed for this organization.")
        }

        // Make sure the org/model exist
        modelDAO.getModel(orgId, resourceId)
        val org = organizationDAO.getOrganization(orgId, refreshCacheEntry = true)
        subscriptionValidator.validate(org)
        val bucketOverride = org.resolveRegionBucket(body.region)
        if (body.region != null && bucketOverride == null) {
            throw IllegalArgumentException("Unsupported region provided: ${body.region}. Remove the requested region to use the default.")
        }

        val datasetTimestamp = body.datasetTimestamp
        val segments = Segment(body.segmentTags)
        val key: ValidatedIdentity = authentication.getKey()
        val fileType: WhyLabsFileExtension = WhyLabsFileExtension.valueOf(file_extension ?: "BIN")

        val response = logUtil.logAsyncProfile(
            orgId,
            resourceId,
            datasetTimestamp,
            segments,
            key.identityId,
            bucketOverride = bucketOverride,
            fileExtension = fileType,
            idempotencyKey = idempotency_key
        )
        if (!idempotency_key.isNullOrEmpty()) {
            idempotentRequestManager.setIdempotentRequestProperties(
                idempotency_key,
                IdempotencyKeyAttributes(
                    key = idempotency_key,
                    orgId = orgId,
                    datasetId = resourceId,
                )
            )
        }

        return response
    }
}
