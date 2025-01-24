package ai.whylabs.songbird.v1.controllers

import ai.whylabs.songbird.common.WhyLabsAttributes.RequestOrganizationId
import ai.whylabs.songbird.logging.JsonLogging
import ai.whylabs.songbird.membership.ClaimConfigurationMembership
import ai.whylabs.songbird.membership.ClaimMembershipResolver
import ai.whylabs.songbird.membership.ClaimMembershipRoleConfiguration
import ai.whylabs.songbird.operations.SamlConnectionOrganization
import ai.whylabs.songbird.security.ApiKeyAuth
import ai.whylabs.songbird.security.SecurityValues
import ai.whylabs.songbird.v0.controllers.Response
import io.micronaut.http.MediaType
import io.micronaut.http.annotation.Body
import io.micronaut.http.annotation.Controller
import io.micronaut.http.annotation.Delete
import io.micronaut.http.annotation.Get
import io.micronaut.http.annotation.Post
import io.micronaut.http.annotation.QueryValue
import io.micronaut.http.annotation.RequestAttribute
import io.micronaut.security.annotation.Secured
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.media.Schema
import io.swagger.v3.oas.annotations.security.SecurityRequirement
import io.swagger.v3.oas.annotations.tags.Tag
import io.swagger.v3.oas.annotations.tags.Tags
import jakarta.inject.Inject

@SecurityRequirement(name = ApiKeyAuth)
@Controller("/v1/membership")
@Tags(
    Tag(name = "Membership", description = "Endpoint for user membership in organizations"),
)
@Secured(SecurityValues.WhyLabsAdministratorRole)
class MembershipController @Inject constructor(
    private val samlConnectionOrganization: SamlConnectionOrganization,
    private val claimMembershipResolver: ClaimMembershipResolver,
) : JsonLogging {

    @Operation(
        operationId = "GetSamlRoleMapping",
        summary = "Get SAML JIT role claim mapping.",
        description = "Get SAML JIT role claim mapping.",
    )
    @Get(
        uri = "/saml/role-mapping",
        produces = [MediaType.APPLICATION_JSON]
    )
    fun getSamlRoleMapping(
        @Schema(description = "WhyLabs OrgId", hidden = true, required = false)
        @RequestAttribute(RequestOrganizationId) orgId: String,
        @QueryValue connection: String,
    ): ClaimMembershipRoleConfiguration {
        if (!samlConnectionOrganization.isConnectionOwner(connection, orgId)) {
            throw IllegalArgumentException("Connection $connection is not configured by this organization.")
        }
        return claimMembershipResolver.getClaimMembershipRoleConfiguration(connection)
    }

    @Operation(
        operationId = "AddSamlRoleMapping",
        summary = "Add SAML JIT role claim mapping.",
        description = "Add SAML JIT role claim mapping.",
    )
    @Post(
        uri = "/saml/role-mapping",
        produces = [MediaType.APPLICATION_JSON]
    )
    fun addSamlRoleMapping(
        @Schema(description = "WhyLabs OrgId", hidden = true, required = false)
        @RequestAttribute(RequestOrganizationId) orgId: String,
        @QueryValue connection: String,
        @QueryValue group: String,
        @Body request: List<ClaimConfigurationMembership>
    ): Response {
        if (!samlConnectionOrganization.isConnectionOwner(connection, orgId)) {
            throw IllegalArgumentException("Connection $connection is not configured by this organization.")
        }
        claimMembershipResolver.addClaimMembershipMapping(connection, group, request)
        return Response()
    }

    @Operation(
        operationId = "DeleteSamlRoleMapping",
        summary = "Delete SAML JIT role claim mapping.",
        description = "DeleteSAML JIT role claim mapping.",
    )
    @Delete(
        uri = "/saml/role-mapping",
        produces = [MediaType.APPLICATION_JSON]
    )
    fun deleteSamlRoleMapping(
        @Schema(description = "WhyLabs OrgId", hidden = true, required = false)
        @RequestAttribute(RequestOrganizationId) orgId: String,
        @QueryValue connection: String,
        @QueryValue group: String,
    ): Response {
        if (!samlConnectionOrganization.isConnectionOwner(connection, orgId)) {
            throw IllegalArgumentException("Connection $connection is not configured by this organization.")
        }
        claimMembershipResolver.deleteClaimMembershipMapping(connection, group)
        return Response()
    }
}
