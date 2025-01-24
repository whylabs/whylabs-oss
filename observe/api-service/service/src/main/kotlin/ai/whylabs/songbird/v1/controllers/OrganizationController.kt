package ai.whylabs.songbird.v1.controllers

import ai.whylabs.songbird.EnvironmentConfig
import ai.whylabs.songbird.common.WhyLabsAttributes.RequestOrganizationId
import ai.whylabs.songbird.dataservice.DataService
import ai.whylabs.songbird.logging.JsonLogging
import ai.whylabs.songbird.security.ApiKeyAuth
import ai.whylabs.songbird.security.SecurityValues.AdministratorRole
import ai.whylabs.songbird.security.SecurityValues.UserRole
import ai.whylabs.songbird.v0.controllers.Response
import ai.whylabs.songbird.v0.controllers.toOrganizationSummary
import ai.whylabs.songbird.v0.dao.OrganizationDAO
import ai.whylabs.songbird.v0.dao.OrganizationSummary
import ai.whylabs.songbird.v0.dao.SubscriptionMetadataDAO
import ai.whylabs.songbird.v0.ddb.SubscriptionKey
import ai.whylabs.songbird.v0.ddb.SubscriptionMetadataItem
import ai.whylabs.songbird.v0.ddb.SubscriptionTier
import ai.whylabs.songbird.v0.ddb.SubscriptionType
import io.micronaut.http.MediaType
import io.micronaut.http.annotation.Body
import io.micronaut.http.annotation.Controller
import io.micronaut.http.annotation.Get
import io.micronaut.http.annotation.Post
import io.micronaut.http.annotation.Put
import io.micronaut.http.annotation.RequestAttribute
import io.micronaut.security.annotation.Secured
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.media.Schema
import io.swagger.v3.oas.annotations.security.SecurityRequirement
import io.swagger.v3.oas.annotations.tags.Tag
import io.swagger.v3.oas.annotations.tags.Tags
import jakarta.inject.Inject

@SecurityRequirement(name = ApiKeyAuth)
@Controller("/v1/organizations")
@Tags(
    Tag(name = "Organizations", description = "Interactions related to organizations."),
)
@Secured(AdministratorRole)
open class OrganizationController @Inject constructor(
    private val dataService: DataService,
    private val organizationDAO: OrganizationDAO,
    private val subscriptionDAO: SubscriptionMetadataDAO,
    val config: EnvironmentConfig,
) : JsonLogging {

    @Operation(
        operationId = "GetManagedOrganizations",
        summary = "List managed organizations for a parent organization",
        description = "List managed organizations for a parent organization",
    )
    @Get(uri = "/managed-organizations", produces = [MediaType.APPLICATION_JSON])
    @Secured(AdministratorRole, UserRole)
    open suspend fun getManagedOrganizations(
        @Schema(description = "WhyLabs OrgId", hidden = true, required = false)
        @RequestAttribute(RequestOrganizationId) orgId: String,
    ): List<OrganizationIdentifier> {
        return organizationDAO.listManagedOrganizations(orgId).map { it.toOrganizationIdentifier() }
    }

    @Operation(
        operationId = "CreateManagedOrganization",
        summary = "Create a managed organization for a parent organization",
        description = "Create a managed organization for a parent organization",
    )
    @Post(uri = "/managed-organization", produces = [MediaType.APPLICATION_JSON])
    open suspend fun createManagedOrganization(
        @Schema(description = "WhyLabs OrgId", hidden = true, required = false)
        @RequestAttribute(RequestOrganizationId) orgId: String,
        @Body payload: CreateManagedOrganizationRequest,
    ): OrganizationIdentifier {
        val parentOrg = organizationDAO.getOrganization(orgId)
        if (parentOrg.parentOrgId != null) {
            throw IllegalArgumentException("Cannot create a managed organization from this organization. This is a managed organization.")
        }
        if (parentOrg.subscriptionTier == SubscriptionTier.FREE) {
            throw IllegalArgumentException("Cannot create a managed organization from a this organization. Please contact us to enable this feature.")
        }
        if (parentOrg.subscriptionTier == SubscriptionTier.SUBSCRIPTION) {
            val subscriptionItem = SubscriptionMetadataItem(key = SubscriptionKey(parentOrg.id))
            val subscription = subscriptionDAO.load(subscriptionItem)
            if (subscription?.subscriptionType == SubscriptionType.STRIPE) {
                throw IllegalArgumentException("Cannot create a managed organization from this organization. Please contact us to enable this feature.")
            }
        }
        val id = organizationDAO.createOrganization(
            payload.name,
            subscriptionTier = parentOrg.subscriptionTier,
            emailDomains = parentOrg.emailDomains,
            observatoryUrl = parentOrg.observatoryUrl,
            parentOrgId = parentOrg.id,
            allowManagedMembershipUpdatesOnly = true,
        )

        val childOrg = organizationDAO.getOrganization(id, refreshCacheEntry = true)
        return childOrg.toOrganizationSummary().toOrganizationIdentifier()
    }

    @Operation(
        operationId = "UploadResourceTagConfiguration",
        summary = "Upload resoruce tag configuration for an organization",
        description = "Upload resoruce tag configuration for an organization",
    )
    @Put(uri = "/resource-tag", produces = [MediaType.APPLICATION_YAML])
    @Secured(AdministratorRole, UserRole)
    open suspend fun uploadResourceTagConfiguration(
        @Schema(description = "WhyLabs OrgId", hidden = true, required = false)
        @RequestAttribute(RequestOrganizationId) orgId: String,
        @Body body: String,
    ): Response {
        dataService.organizationApi.uploadOrgResourceTagConfiguration(orgId, body)
        return Response()
    }

    @Operation(
        operationId = "GetResourceTagConfiguration",
        summary = "Get resoruce tag configuration for an organization",
        description = "Get resoruce tag configuration for an organization",
    )
    @Get(uri = "/resource-tag", produces = [MediaType.APPLICATION_YAML])
    @Secured(AdministratorRole, UserRole)
    open suspend fun getResourceTagConfiguration(
        @Schema(description = "WhyLabs OrgId", hidden = true, required = false)
        @RequestAttribute(RequestOrganizationId) orgId: String,
    ): String {
        return dataService.organizationApi.getOrgResourceTagConfiguration(orgId)
    }
}

@Schema(description = "Request to create a managed organization")
data class CreateManagedOrganizationRequest(
    val name: String,
)

@Schema(description = "Identifier for an an organization", requiredProperties = ["id"])
data class OrganizationIdentifier(
    val id: String,
    val name: String,
)

fun OrganizationSummary.toOrganizationIdentifier(): OrganizationIdentifier {
    return OrganizationIdentifier(
        id = this.id,
        name = this.name,
    )
}
