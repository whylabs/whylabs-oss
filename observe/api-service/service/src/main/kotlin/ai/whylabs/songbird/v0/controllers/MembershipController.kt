package ai.whylabs.songbird.v0.controllers

import ai.whylabs.songbird.EnvironmentConfig
import ai.whylabs.songbird.logging.JsonLogging
import ai.whylabs.songbird.membership.ClaimMembershipResolver
import ai.whylabs.songbird.membership.Membership
import ai.whylabs.songbird.membership.OrganizationMembershipHandler
import ai.whylabs.songbird.operations.AuditableResponseBody
import ai.whylabs.songbird.operations.ResourceNotFoundException
import ai.whylabs.songbird.security.ApiKeyAuth
import ai.whylabs.songbird.security.SecurityValues
import ai.whylabs.songbird.security.WhyLabsInternal
import ai.whylabs.songbird.v0.dao.ClaimMembershipDAO
import ai.whylabs.songbird.v0.dao.MembershipDAO
import ai.whylabs.songbird.v0.dao.MembershipMetadata
import ai.whylabs.songbird.v0.dao.OrganizationDAO
import ai.whylabs.songbird.v0.dao.UserDAO
import ai.whylabs.songbird.v0.ddb.ClaimMembershipItem
import ai.whylabs.songbird.v0.ddb.MembershipItem
import ai.whylabs.songbird.v0.ddb.Role
import ai.whylabs.songbird.v0.ddb.UserItem
import io.micronaut.http.MediaType
import io.micronaut.http.annotation.Body
import io.micronaut.http.annotation.Controller
import io.micronaut.http.annotation.Delete
import io.micronaut.http.annotation.Get
import io.micronaut.http.annotation.Patch
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

class MembershipNotFoundException(userId: String?, orgId: String?) :
    ResourceNotFoundException("Membership", "$userId/$orgId")

@SecurityRequirement(name = ApiKeyAuth)
@Controller("/v0/membership")
@Tags(
    Tag(name = "Membership", description = "Endpoint for user membership in organizations"),
    Tag(name = "Internal", description = "Internal API"),
)
@Secured(SecurityValues.WhyLabsAdministratorRole, SecurityValues.WhyLabsSystemRole)
@WhyLabsInternal
class MembershipController @Inject constructor(
    private val environmentConfig: EnvironmentConfig,
    private val membershipHandler: OrganizationMembershipHandler,
    private val claimMembershipResolver: ClaimMembershipResolver,
    private val membershipDAO: MembershipDAO,
    private val claimMembershipDAO: ClaimMembershipDAO,
    private val organizationDAO: OrganizationDAO,
    private val userDAO: UserDAO,
) : JsonLogging {

    @Operation(
        operationId = "GetMembershipsByEmail",
        summary = "Get memberships for a user given that user's email address.",
        description = "Get memberships for a user given that user's email address.",
    )
    @Get(
        uri = "/user",
        produces = [MediaType.APPLICATION_JSON]
    )
    fun getMembershipsByEmail(
        @QueryValue email: String,
        @QueryValue include_claims: Boolean? = false
    ): GetMembershipsResponse {
        return GetMembershipsResponse(membershipHandler.getUserMembershipsByEmail(email, includeClaims = include_claims ?: false))
    }

    @Operation(
        operationId = "UpdateMembershipByClaims",
        summary = "Update memberships for a user by SAML claims",
        description = "Update memberships for a user by SAML claims",
    )
    @Patch(
        uri = "/claims",
        produces = [MediaType.APPLICATION_JSON]
    )
    fun updateMembershipByClaims(
        @QueryValue email: String,
        @Body request: UpdateMembershipByClaimsRequest,
    ): Response {
        val user = try {
            userDAO.list(UserItem(email = email.lowercase())).first()
        } catch (e: NoSuchElementException) {
            // create new user if not found
            userDAO.create(UserItem(email = email.lowercase()))
        }

        val existingClaims = membershipHandler.getUserClaimMembershipsByEmail(email)
        val resolvedClaims = claimMembershipResolver.resolveClaimMembership(user, request.connectionName, request.roleMappings)
        // existing claims need to be before resolved claims to ensure they are deleted first if roles change
        val joinedClaims = existingClaims + resolvedClaims
        val entriesRequiringAction = joinedClaims
            .groupBy { "${it.orgId}#${it.userId}#${it.role.name}" }
            .filter { it.value.size == 1 }
            .flatMap { it.value }

        entriesRequiringAction.forEach {
            if (existingClaims.contains(it)) {
                try {
                    membershipHandler.deleteClaimMembership(user, it.orgId)
                } catch (e: IllegalArgumentException) {
                    log.info("Tried to delete claim membership for user ${user.userId} in org ${it.orgId} but the claim was already deleted.")
                }
            } else {
                membershipHandler.createClaimMembership(it.email, it.orgId, it.role)
            }
        }
        return Response()
    }

    @Operation(
        operationId = "GetDefaultMembershipForEmail",
        summary = "Get the default membership for a user.",
        description = "Get the default membership for a user.",
    )
    @Get(
        uri = "/default",
        produces = [MediaType.APPLICATION_JSON]
    )
    fun getDefaultMembershipForEmail(@QueryValue email: String): GetDefaultMembershipResponse {
        val user = try {
            userDAO.list(UserItem(email = email.lowercase())).first()
        } catch (e: NoSuchElementException) {
            throw UserNotFoundException(null, email)
        }

        val memberships = membershipHandler.getUserMembershipsById(user.userId, includeClaims = true)

        // The default membership is the first membership marked as default. There should only ever be one.
        // If there are none marked default then this returns the min orgId.
        val defaultMembership = memberships.firstOrNull { it.default }
            ?: memberships.minByOrNull { it.orgId }

        return GetDefaultMembershipResponse(
            defaultMembership?.let {
                Membership(
                    orgId = it.orgId,
                    default = it.default,
                    role = it.role,
                    userId = it.userId,
                    email = user.email
                )
            }
        )
    }

    @Operation(
        operationId = "GetMembershipsByOrg",
        summary = "Get memberships for an org.",
        description = "Get memberships for an org.",
    )
    @Get(
        uri = "/org/{org_id}",
        produces = [MediaType.APPLICATION_JSON]
    )
    fun getMembershipsByOrg(
        org_id: String,
        @QueryValue include_claims: Boolean? = false,
    ): GetMembershipsResponse {
        return GetMembershipsResponse(membershipHandler.listOrganizationMemberships(org_id, includeClaims = include_claims ?: false))
    }

    @Operation(
        operationId = "GetMemberships",
        summary = "Get memberships for a user.",
        description = "Get memberships for a user.",
    )
    @Get(
        uri = "/user/{user_id}",
        produces = [MediaType.APPLICATION_JSON]
    )
    @WhyLabsInternal
    fun getMemberships(
        user_id: String,
        @QueryValue include_claims: Boolean? = false,
    ): GetMembershipsResponse {
        return GetMembershipsResponse(membershipHandler.getUserMembershipsById(user_id, includeClaims = include_claims ?: false))
    }

    @AuditableResponseBody
    @Operation(
        operationId = "CreateMembership",
        summary = "Create a membership for a user, making them apart of an organization. Uses the user's current email address.",
        description = "Create a membership for a user, making them apart of an organization. Uses the user's current email address.",
    )
    @Post(
        uri = "/",
        processes = [MediaType.APPLICATION_JSON],
    )
    fun createMembership(@Body request: AddMembershipRequest): MembershipMetadata {
        checkOrganizationMembershipManagement(request.orgId)

        return membershipHandler.createOrganizationMembership(request.email, request.orgId, request.role, request.createdBy, request.default)
    }

    @AuditableResponseBody
    @Operation(
        operationId = "UpdateMembershipByEmail",
        summary = "Updates the role in an membership",
        description = "Updates the role in an membership, given the organization and the user's email address.",
    )
    @Put(
        uri = "/",
        processes = [MediaType.APPLICATION_JSON]
    )
    fun updateMembershipByEmail(@Body request: UpdateMembershipRequest): MembershipMetadata {
        checkOrganizationMembershipManagement(request.orgId)

        return membershipHandler.updateOrganizationMembership(request.email, request.orgId, request.role)
    }

    @Operation(
        operationId = "RemoveMembershipByEmail",
        summary = "Removes membership in a given org from a user, using the user's email address.",
        description = "Removes membership in a given org from a user, using the user's email address.",
    )
    @Delete(
        uri = "/",
        consumes = [MediaType.APPLICATION_JSON],
    )
    fun removeMembershipByEmail(@Body request: RemoveMembershipRequest): Response {
        checkOrganizationMembershipManagement(request.orgId)

        membershipHandler.deleteOrganizationMembership(request.email, request.orgId)
        return Response()
    }

    @Operation(
        operationId = "SetDefaultMembership",
        summary = "Sets the organization that should be used when logging a user in",
        description = "Sets the organization that should be used when logging a user in",
    )
    @Post(
        uri = "/default",
        consumes = [MediaType.APPLICATION_JSON],
        produces = [MediaType.APPLICATION_JSON]
    )
    fun setDefaultMembership(@Body request: SetDefaultMembershipRequest): Response {
        val userId = request.userId
        val orgId = request.orgId

        organizationDAO.getOrganization(orgId)
        membershipHandler.getUserMembershipsById(userId, includeClaims = true)
            .find { membership -> membership.orgId == orgId }
            ?: throw MembershipNotFoundException(userId, orgId)

        log.info("Org exists and user is a member of the org, proceeding.")

        // Ensure the user exists
        val user = try {
            userDAO.load(UserItem(userId = userId))
        } catch (e: NoSuchElementException) {
            null
        } ?: throw UserNotFoundException(userId, null)

        val memberships = membershipDAO.list(MembershipItem(userId = user.userId)).toList()
        memberships.forEach {
            membershipDAO.update(membershipDAO.toItem(it.copy(default = it.orgId == request.orgId)))
        }
        val claimMemberships = claimMembershipDAO.list(ClaimMembershipItem(userId = user.userId)).toList()
        claimMemberships.forEach {
            claimMembershipDAO.update(claimMembershipDAO.toItem(it.copy(default = it.orgId == request.orgId)))
        }
        return Response()
    }

    private fun checkOrganizationMembershipManagement(orgId: String) {
        val org = organizationDAO.getOrganization(orgId, refreshCacheEntry = true)
        if (org.allowManagedMembershipUpdatesOnly == true) {
            throw IllegalArgumentException("Organization ${org.id} does not allow direct membership updates")
        }
    }
}

data class UserMembershipNotificationSqsMessage(val org_id: String, val org_name: String, val user_id: String, val user_email: String, val created_by: String?)

@Schema(description = "Response for the GetMemberships API", requiredProperties = ["memberships"])
data class GetMembershipsResponse(
    @field:ArraySchema(
        arraySchema = Schema(description = "A list of all memberships that a user has."),
    )
    val memberships: List<Membership>,
)

@Schema(
    description = "Response for the RemoveMembership API. The membership parameter is the default membership " +
        "if one exists. One won't exist if the user has no memberships at all."
)
data class GetDefaultMembershipResponse(
    // **CLIENT_GEN_ISSUE nullable = false needed to avoid allOf issue
    @field:Schema(nullable = false)
    val membership: Membership?,
)

@Schema(requiredProperties = ["orgId", "email", "role"])
data class AddMembershipRequest(
    val orgId: String,
    val email: String,
    val role: Role,
    val createdBy: String?,

    @field:Schema(defaultValue = "false", nullable = true)
    val default: Boolean? = null
)

@Schema(requiredProperties = ["connectionName", "roleMappings"])
data class UpdateMembershipByClaimsRequest(
    val connectionName: String,
    val roleMappings: List<String>,
)

@Schema(requiredProperties = ["orgId", "userId"])
data class SetDefaultMembershipRequest(val orgId: String, val userId: String)

@Schema(requiredProperties = ["orgId", "email", "role"])
data class UpdateMembershipRequest(val orgId: String, val email: String, val role: Role)

@Schema(requiredProperties = ["orgId", "email"])
data class RemoveMembershipRequest(val orgId: String, val email: String)
