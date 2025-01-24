@file:Suppress("RedundantSuspendModifier")

package ai.whylabs.songbird.v0.controllers

import ai.whylabs.songbird.EnvironmentConfig
import ai.whylabs.songbird.logging.JsonLogging
import ai.whylabs.songbird.membership.OrganizationMembershipHandler
import ai.whylabs.songbird.operations.ResourceNotFoundException
import ai.whylabs.songbird.security.ApiKeyAuth
import ai.whylabs.songbird.security.SecurityValues.WhyLabsAdministratorRole
import ai.whylabs.songbird.security.SecurityValues.WhyLabsSystemRole
import ai.whylabs.songbird.security.WhyLabsInternal
import ai.whylabs.songbird.util.DocUtils
import ai.whylabs.songbird.util.RegionBucket
import ai.whylabs.songbird.v0.dao.AWSMarketplaceMetadata
import ai.whylabs.songbird.v0.dao.AWSMarketplaceMetadataDAO
import ai.whylabs.songbird.v0.dao.OrganizationDAO
import ai.whylabs.songbird.v0.dao.OrganizationDAO2
import ai.whylabs.songbird.v0.dao.OrganizationMetadata
import ai.whylabs.songbird.v0.dao.OrganizationSummary
import ai.whylabs.songbird.v0.dao.SubscriptionMetadataDAO
import ai.whylabs.songbird.v0.ddb.AWSMarketplaceMetadataItem
import ai.whylabs.songbird.v0.ddb.DdbConditions.shouldEq
import ai.whylabs.songbird.v0.ddb.OrganizationItem
import ai.whylabs.songbird.v0.ddb.SubscriptionKey
import ai.whylabs.songbird.v0.ddb.SubscriptionMetadataItem
import ai.whylabs.songbird.v0.ddb.SubscriptionTier
import io.micronaut.http.MediaType
import io.micronaut.http.annotation.Controller
import io.micronaut.http.annotation.Delete
import io.micronaut.http.annotation.Get
import io.micronaut.http.annotation.Post
import io.micronaut.http.annotation.Put
import io.micronaut.http.annotation.QueryValue
import io.micronaut.security.annotation.Secured
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.media.ArraySchema
import io.swagger.v3.oas.annotations.media.Schema
import io.swagger.v3.oas.annotations.security.SecurityRequirement
import io.swagger.v3.oas.annotations.tags.Tag
import io.swagger.v3.oas.annotations.tags.Tags
import jakarta.inject.Inject
import java.net.URI

@SecurityRequirement(name = ApiKeyAuth)
@Controller("/v0/organizations")
@Tags(
    Tag(name = "Internal", description = "Internal API"),
    Tag(name = "Organizations", description = "Interactions related to organizations."),
)
@WhyLabsInternal
@Secured(WhyLabsAdministratorRole, WhyLabsSystemRole)
open class OrganizationController @Inject constructor(
    private val organizationDAO: OrganizationDAO,
    private val organizationDAO2: OrganizationDAO2,
    private val subscriptionMetadataDAO: SubscriptionMetadataDAO,
    private val awsMarketplaceDAO: AWSMarketplaceMetadataDAO,
    private val organizationMembershipHandler: OrganizationMembershipHandler,
    val config: EnvironmentConfig
) : JsonLogging {

    /**
     * @return a list of organization summary items
     */
    @Operation(
        operationId = "ListOrganizations",
        summary = "Get a list of all of the organization ids.",
        description = "Get a list of all of the organization ids.",
    )
    @Get(uri = "/", produces = [MediaType.APPLICATION_JSON])
    suspend fun listOrganizations(): ListOrganizationsResponse {
        return ListOrganizationsResponse(items = organizationDAO.listOrganizations())
    }

    /**
     * @param org_id The unique ID of an organization
     * @return The organization metadata
     */
    @Operation(
        operationId = "GetOrganization",
        summary = "Get the metadata about an organization.",
        description = "Returns various metadata about an organization",
    )
    @Get(uri = "/{org_id}", produces = [MediaType.APPLICATION_JSON])
    fun getOrganization(org_id: String): OrganizationMetadata {
        val org = organizationDAO.getOrganization(org_id, refreshCacheEntry = true)
        val subscriptionId = if (org.subscriptionTier == SubscriptionTier.SUBSCRIPTION) {
            val subscription = SubscriptionMetadataItem(key = SubscriptionKey(org.id))
            subscriptionMetadataDAO.load(subscription)?.subscriptionId
        } else {
            null
        }
        // notificationSettings should not be used anywhere, so we set it to null
        return org.copy(subscriptionId = subscriptionId)
    }

    @Operation(
        operationId = "DeleteOrganization",
        summary = "Delete an org",
        description = "Delete an org",
    )
    @Delete(uri = "/{org_id}")
    fun deleteOrganization(org_id: String): Response {
        log.info("Soft deleting $org_id")
        val org = organizationDAO2.load(OrganizationItem(orgId = org_id)) ?: throw ResourceNotFoundException("Org doesn't exist", org_id)

        val memberships = organizationMembershipHandler.listOrganizationMemberships(org_id)
        // delete all memberships in org_id before deleting it
        memberships.forEach {
            try {
                organizationMembershipHandler.deleteMembershipById(it.userId, org_id)
            } catch (e: Exception) {
                log.error("Failed to delete membership for user ${it.userId} in org $org_id", e)
            }
        }
        organizationDAO2.update(organizationDAO2.toItem(org.copy(deleted = true)))

        try {
            organizationDAO.getOrganization(org_id, refreshCacheEntry = true)
        } catch (e: ResourceNotFoundException) {
            // Good, its deleted
        }
        return Response()
    }

    /**
     * Update only some values of an organization, while leaving empty values that you do not wish to update.
     * This method cannot update a value to <code>null</code>; a <code>null</code> input is interpreted as a value that to be
     * copied over from the existing value.
     *
     * @param org_id The unique ID of an organization. If an organization with this ID does not exist, this method will throw an exception.
     * @param name The name of the organization
     * @param subscription_tier Organization's subscription tier. Should be PAID for real customers
     * @param email_domains Email domains associated with this organization, as a comma separated list
     * @param observatory_url Url that users of this organization will be redirected to in some cases (such as via Siren notifications). NOTE: should NOT be followed by a trailing slash!
     * @return A summary of the organization object if succeeds
     */
    @Operation(
        operationId = "PartiallyUpdateOrganization",
        summary = "Update some fields of an organization to non-null values",
        description = "Update some fields of an organization to non-null values, leaving all other existing values the same",
    )
    @Put(uri = "/partial/{org_id}", produces = [MediaType.APPLICATION_JSON])
    open suspend fun partiallyUpdateOrganization(
        org_id: String,
        @QueryValue name: String? = null,
        // schema with example causes type issue, enumAsRef causes compile issue on optional enums
        @QueryValue subscription_tier: SubscriptionTier? = null,
        @QueryValue email_domains: String? = null,
        @QueryValue observatory_url: String? = null,
        @QueryValue parent_org_id: String? = null,
        @QueryValue storage_bucket_override: String? = null,
        @QueryValue storage_uri_override: String? = null,
        @QueryValue allow_managed_membership_updates_only: Boolean? = null,
        @QueryValue use_cloudfront: Boolean? = null,
    ): OrganizationSummary {
        val bucketOverride = RegionBucket.fromUri(storage_bucket_override)
        val uriOverride = resolveOverrideUri(storage_uri_override)
        val original = organizationDAO.getOrganization(org_id, refreshCacheEntry = true)

        if (original.deleted) {
            log.warn("Attempted to update a deleted org $org_id")
            throw ResourceNotFoundException(resource = "organization", id = org_id)
        }

        val updatedOrganization = original.copy(
            id = org_id,
            name = name ?: original.name,
            subscriptionTier = subscription_tier ?: original.subscriptionTier,
            emailDomains = email_domains ?: original.emailDomains,
            observatoryUrl = observatory_url ?: original.observatoryUrl,
            parentOrgId = parent_org_id ?: original.parentOrgId,
            deleted = false,
            storageBucketOverride = bucketOverride?.uri?.uri?.toURL()?.toString() ?: original.storageBucketOverride,
            storageUriOverride = uriOverride ?: original.storageUriOverride,
            allowManagedMembershipUpdatesOnly = allow_managed_membership_updates_only ?: original.allowManagedMembershipUpdatesOnly,
            useCloudFront = use_cloudfront ?: original.useCloudFront,
        )
        val id = organizationDAO.updateOrganization(updatedOrganization)
        return organizationDAO.getOrganization(id, refreshCacheEntry = true).toOrganizationSummary()
    }

    @Operation(
        operationId = "GetAWSMarketplaceMetadata",
        summary = "Get marketplace metadata for an org if any exists.",
        description = "Get marketplace metadata for an org if any exists."
    )
    @Get(uri = "{org_id}/marketplace-metadata/", produces = [MediaType.APPLICATION_JSON])
    suspend fun getMarketplaceMetadata(org_id: String): GetMarketplaceMetadataResponse {
        organizationDAO.checkExistence(org_id)
        val marketplaceMetadataResponse = awsMarketplaceDAO.list(
            AWSMarketplaceMetadataItem(orgId = org_id),
            rangeKeyConditions = shouldEq("org_id", org_id)
        )
        val metadata = marketplaceMetadataResponse.firstOrNull() ?: return GetMarketplaceMetadataResponse(metadata = null)

        return GetMarketplaceMetadataResponse(metadata = metadata)
    }

    /**
     * @param name The name of the organization
     * @param subscription_tier Organization's subscription tier. Should be PAID for real customers
     * @param email_domains Email domains associated with this organization, as a comma separated list
     * @param override_id Custom ID. If this ID is invalid this method will throw an exception
     * @return A summary of the organization object if succeeds
     */
    @Operation(
        operationId = "CreateOrganization",
        summary = "Create an organization",
        description = "Create an organization",
    )
    @Post(uri = "/", produces = [MediaType.APPLICATION_JSON])
    open suspend fun createOrganization(
        @Schema(example = DocUtils.ExampleOrgName) @QueryValue name: String,
        // schema with example causes type issue, enumAsRef causes compile issue on optional enums
        @QueryValue subscription_tier: SubscriptionTier? = null,
        @Schema(example = DocUtils.ExampleDomains) @QueryValue email_domains: String? = null,
        @Schema(example = DocUtils.ExampleOrgId) @QueryValue override_id: String? = null,
        @Schema(example = DocUtils.ExampleObservatoryUrl) @QueryValue observatory_url: String? = null,
        @Schema(example = DocUtils.ExampleOrgId) @QueryValue parent_org_id: String? = null,
        @QueryValue storage_bucket_override: String? = null,
        @QueryValue storage_uri_override: String? = null,
        @QueryValue allow_managed_membership_updates_only: Boolean? = null,
        @QueryValue use_cloud_front: Boolean? = null,
    ): OrganizationSummary {
        val bucketOverride = RegionBucket.fromUri(storage_bucket_override)
        val uriOverride = resolveOverrideUri(storage_uri_override)
        val id = organizationDAO.createOrganization(
            name,
            subscription_tier,
            email_domains,
            observatory_url,
            override_id,
            useCloudFront = use_cloud_front,
            parentOrgId = parent_org_id,
            storageBucketOverride = bucketOverride?.uri?.uri?.toURL()?.toString(),
            storageUriOverride = uriOverride,
            allowManagedMembershipUpdatesOnly = allow_managed_membership_updates_only,
        )

        val org = organizationDAO.getOrganization(id, refreshCacheEntry = true)
        return OrganizationSummary(
            id = org.id,
            name = org.name,
            subscriptionTier = org.subscriptionTier,
            emailDomains = org.emailDomains,
            observatoryUrl = org.observatoryUrl,
            parentOrgId = org.parentOrgId,
        )
    }

    private fun resolveOverrideUri(overrideUri: String?): String? {
        if (overrideUri.isNullOrBlank()) {
            return null
        }
        val uri = URI(overrideUri)
        return uri.toURL().toString()
    }
}

@Schema(description = "Response for listing organization", requiredProperties = ["items"])
data class ListOrganizationsResponse(
    @field:ArraySchema(
        arraySchema = Schema(description = "A list of all known organization metadata"),
        uniqueItems = true,
    )
    val items: List<OrganizationSummary>,

    // IMPORTANT: mark this object for internal API so we can exclude it later
    val internal: Boolean = true,
)

@Schema(description = "Response for listing organization")
data class GetMarketplaceMetadataResponse(
    // **CLIENT_GEN_ISSUE nullable = false needed to avoid allOf issue
    @field:Schema(nullable = false)
    val metadata: AWSMarketplaceMetadata?
)

fun OrganizationMetadata.toOrganizationSummary(): OrganizationSummary {
    return OrganizationSummary(
        id = this.id,
        name = this.name,
        subscriptionTier = this.subscriptionTier,
        emailDomains = this.emailDomains,
        observatoryUrl = this.observatoryUrl,
        parentOrgId = this.parentOrgId,
        allowManagedMembershipUpdatesOnly = this.allowManagedMembershipUpdatesOnly,
    )
}
