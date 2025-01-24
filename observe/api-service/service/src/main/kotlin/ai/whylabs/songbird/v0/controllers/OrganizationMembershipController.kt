package ai.whylabs.songbird.v0.controllers

import ai.whylabs.songbird.logging.JsonLogging
import ai.whylabs.songbird.membership.Membership
import ai.whylabs.songbird.membership.OrganizationMembershipHandler
import ai.whylabs.songbird.operations.AuditableResponseBody
import ai.whylabs.songbird.operations.getValidatedIdentity
import ai.whylabs.songbird.security.ApiKeyAuth
import ai.whylabs.songbird.security.SecurityValues
import ai.whylabs.songbird.util.DocUtils
import ai.whylabs.songbird.util.DocUtils.Companion.OrganizationUri
import ai.whylabs.songbird.v0.dao.MembershipMetadata
import ai.whylabs.songbird.v0.ddb.Role
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

@SecurityRequirement(name = ApiKeyAuth)
@Controller("/v0/$OrganizationUri/membership")
@Tags(
    Tag(name = "Membership", description = "Endpoint for organization user membership"),
)
@Secured(SecurityValues.WhyLabsAdministratorRole, SecurityValues.WhyLabsSystemRole, SecurityValues.AdministratorRole)
class OrganizationMembershipController @Inject constructor(
    private val membershipHandler: OrganizationMembershipHandler,
) : JsonLogging {

    @Operation(
        operationId = "ListOrganizationMemberships",
        summary = "List organization memberships",
        description = "list memberships for an organization",
    )
    @Get(
        uri = "/",
        produces = [MediaType.APPLICATION_JSON]
    )
    suspend fun listOrganizationMemberships(
        @Schema(example = DocUtils.ExampleOrgId) org_id: String,
    ): ListOrganizationMembershipsResponse {
        return ListOrganizationMembershipsResponse(membershipHandler.listOrganizationMemberships(org_id))
    }

    @AuditableResponseBody
    @Operation(
        operationId = "CreateOrganizationMembership",
        summary = "Create a membership for a user, making them a part of an organization. Uses the user's current email address.",
        description = "Create a membership for a user, making them a part of an organization. Uses the user's current email address.",
    )
    @Post(
        uri = "/",
        produces = [MediaType.APPLICATION_JSON],
    )
    suspend fun createOrganizationMembership(
        @Schema(example = DocUtils.ExampleOrgId) org_id: String,
        @Schema(example = DocUtils.ExampleEmail) @QueryValue email: String,
        @QueryValue role: Role,
        @Schema(defaultValue = "false", nullable = true) @QueryValue set_default: Boolean? = false,
    ): MembershipMetadata {
        val callerIdentity = getValidatedIdentity()
        return membershipHandler.createOrganizationMembership(email, org_id, role, createdBy = callerIdentity?.identityId, default = set_default)
    }

    @AuditableResponseBody
    @Operation(
        operationId = "UpdateOrganizationMembership",
        summary = "Updates the role in an membership",
        description = "Updates the role in an membership, given the organization and the user's email address.",
    )
    @Put(
        uri = "/",
        produces = [MediaType.APPLICATION_JSON],
    )
    suspend fun updateOrganizationMembership(
        @Schema(example = DocUtils.ExampleOrgId) org_id: String,
        @Schema(example = DocUtils.ExampleEmail) @QueryValue email: String,
        @QueryValue role: Role,
    ): MembershipMetadata {
        return membershipHandler.updateOrganizationMembership(email, org_id, role)
    }

    @AuditableResponseBody
    @Operation(
        operationId = "RemoveOrganizationMembership",
        summary = "Removes membership in a given org from a user, using the user's email address.",
        description = "Removes membership in a given org from a user, using the user's email address.",
    )
    @Delete(
        uri = "/",
        produces = [MediaType.APPLICATION_JSON],
    )
    suspend fun removeOrganizationMembership(
        @Schema(example = DocUtils.ExampleOrgId) org_id: String,
        @Schema(example = DocUtils.ExampleEmail) @QueryValue email: String,
    ) {
        membershipHandler.deleteOrganizationMembership(email, org_id)
    }
}

@Schema(description = "Response for the ListOrganizationMemberships API", requiredProperties = ["memberships"])
data class ListOrganizationMembershipsResponse(
    @field:ArraySchema(
        arraySchema = Schema(description = "A list of all memberships in an organization."),
        uniqueItems = true,
    )
    val memberships: List<Membership>,
)
