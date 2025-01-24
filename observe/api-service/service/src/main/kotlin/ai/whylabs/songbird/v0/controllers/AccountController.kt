package ai.whylabs.songbird.v0.controllers

import ai.whylabs.songbird.logging.JsonLogging
import ai.whylabs.songbird.membership.Member
import ai.whylabs.songbird.membership.Membership
import ai.whylabs.songbird.membership.OrganizationMembershipHandler
import ai.whylabs.songbird.membership.OrganizationRoleMembers
import ai.whylabs.songbird.operations.ResourceAlreadyExistsException
import ai.whylabs.songbird.operations.ResourceNotFoundException
import ai.whylabs.songbird.security.ApiKeyAuth
import ai.whylabs.songbird.security.SecurityValues
import ai.whylabs.songbird.util.DocUtils
import ai.whylabs.songbird.v0.dao.AccountUser
import ai.whylabs.songbird.v0.dao.AccountUserDAO
import ai.whylabs.songbird.v0.dao.OrganizationDAO
import ai.whylabs.songbird.v0.dao.OrganizationMetadata
import ai.whylabs.songbird.v0.dao.OrganizationSummary
import ai.whylabs.songbird.v0.dao.UserDAO
import ai.whylabs.songbird.v0.ddb.AccountUserItem
import ai.whylabs.songbird.v0.ddb.Role
import ai.whylabs.songbird.v0.ddb.UserItem
import io.micronaut.http.HttpStatus
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

@SecurityRequirement(name = ApiKeyAuth)
@Controller("/v0/accounts/org/{org_id}/")
@Tags(
    Tag(name = "Account", description = "Endpoint for account provisioning"),
    Tag(name = "Internal", description = "Internal API"),
)
@Secured(SecurityValues.WhyLabsAdministratorRole, SecurityValues.WhyLabsSystemRole, SecurityValues.AccountAdministratorRole)
class AccountController @Inject constructor(
    private val organizationDAO: OrganizationDAO,
    private val accountUserDAO: AccountUserDAO,
    private val userDAO: UserDAO,
    private val membershipHandler: OrganizationMembershipHandler,
) : JsonLogging {

    @Operation(
        operationId = "CreateAccountUser",
        summary = "Create an account user",
        description = "Create an account user",
    )
    @Post(
        uri = "/user",
        produces = [MediaType.APPLICATION_JSON]
    )
    fun createAccountUser(
        @Schema(example = DocUtils.ExampleOrgId) org_id: String,
        @Body request: CreateAccountUserRequest
    ): AccountUser {
        val org = organizationDAO.getOrganization(org_id, refreshCacheEntry = true)
        val email = request.email.lowercase()
        if (org.parentOrgId != null) {
            throw IllegalArgumentException("Cannot create account user for a managed organization")
        }
        // TODO add a flag in organization metadata to indicate it supports account users
        val currentUsers = userDAO.list(UserItem(email = email)).toList()
        val currentAccountUsers = accountUserDAO.list(AccountUserItem(email = email)).toList()
        if (currentAccountUsers.isNotEmpty()) {
            throw ResourceAlreadyExistsException("email", email)
        }

        // Create both a WhyLabs user and an account user
        val user = if (currentUsers.isNotEmpty()) {
            currentUsers.first()
        } else {
            userDAO.create(UserItem(email = email))
        }

        val newAccountUser = AccountUserItem(
            orgId = org_id,
            email = user.email,
            userId = user.userId,
            externalId = request.externalId,
            userSchema = request.userSchema,
            active = request.active,
            deleted = false,
        )
        try {
            accountUserDAO.create(newAccountUser)
        } catch (e: IllegalArgumentException) {
            // IllegalArgumentException is thrown when the account user key already exists
            // List filters out deleted items, if this happens at this point, the entry is marked as deleted.
            // Update with deleted=false to re-create the account user.
            accountUserDAO.update(newAccountUser)
        }
        return accountUserDAO.getAccountUserById(org_id, user.userId) ?: throw ResourceNotFoundException("account user", user.userId)
    }
    @Operation(
        operationId = "ListAccountUsers",
        summary = "List users in an account",
        description = "List users in the account organization and any managed organizations",
    )
    @Get(
        uri = "/users",
        produces = [MediaType.APPLICATION_JSON]
    )
    fun listAccountUsers(
        @Schema(example = DocUtils.ExampleOrgId) org_id: String,
    ): List<AccountUser> {
        // TODO pagination support, we need to return users in a stable order so that scim service can implement pagination OR
        // we need to add pagination here
        return accountUserDAO.listForOrganization(orgId = org_id).toList()
    }

    @Operation(
        operationId = "GetAccountUserByEmail",
        summary = "Get account user by email",
        description = "Get account user by email",
    )
    @Get(
        uri = "/user/email",
        produces = [MediaType.APPLICATION_JSON]
    )
    fun getAccountUserByEmail(
        @Schema(example = DocUtils.ExampleOrgId) org_id: String,
        @Schema(example = DocUtils.ExampleEmail) @QueryValue email: String,
    ): AccountUser {
        val items = accountUserDAO.list(AccountUserItem(email = email.lowercase())).toList()
        if (items.isEmpty()) {
            throw ResourceNotFoundException("account user email", email)
        }
        return items.first()
    }

    @Operation(
        operationId = "GetAccountUserById",
        summary = "Get account user by user_id",
        description = "Get account user by user_id",
    )
    @Get(
        uri = "/user/id",
        produces = [MediaType.APPLICATION_JSON]
    )
    fun getAccountUserById(
        @Schema(example = DocUtils.ExampleOrgId) org_id: String,
        @Schema(example = DocUtils.ExampleUserId) @QueryValue user_id: String,
    ): AccountUser {
        return accountUserDAO.getAccountUserById(org_id, user_id) ?: throw ResourceNotFoundException("account user", user_id)
    }

    @Operation(
        operationId = "UpdateAccountUser",
        summary = "Update account user",
        description = "Update an account user's details",
    )
    @Put(
        uri = "/user",
        produces = [MediaType.APPLICATION_JSON]
    )
    fun updateAccountUser(
        @Schema(example = DocUtils.ExampleOrgId) org_id: String,
        @Schema(example = DocUtils.ExampleUserId) @QueryValue user_id: String,
        @Body request: UpdateAccountUserRequest
    ): AccountUser {
        val currentAccountUser = accountUserDAO.getAccountUserById(org_id, user_id) ?: throw ResourceNotFoundException("account user", user_id)
        require(user_id == currentAccountUser.userId) { "Cannot change Whylabs user_id $user_id" }
        val updatedAccountUser = AccountUserItem(
            orgId = currentAccountUser.orgId,
            email = currentAccountUser.email,
            userId = currentAccountUser.userId,
            externalId = request.externalId,
            userSchema = request.userSchema,
            active = request.active,
        )
        accountUserDAO.update(updatedAccountUser)
        if (request.active == false) {
            deleteUserMemberships(currentAccountUser, org_id)
        }

        return accountUserDAO.getAccountUserById(org_id, user_id) ?: throw ResourceNotFoundException("account user", user_id)
    }

    @Operation(
        operationId = "DeleteAccountUser",
        summary = "Delete account user",
        description = "Delete an account user's details",
    )
    @Delete(
        uri = "/user/{user_id}",
        produces = [MediaType.APPLICATION_JSON]
    )
    fun deleteAccountUser(
        @Schema(example = DocUtils.ExampleOrgId) org_id: String,
        @Schema(example = DocUtils.ExampleUserId) user_id: String,
    ): Response {
        val currentAccountUser = accountUserDAO.getAccountUserById(org_id, user_id) ?: throw ResourceNotFoundException("account user", user_id)
        accountUserDAO.update(accountUserDAO.toItem(currentAccountUser).copy(deleted = true))
        deleteUserMemberships(currentAccountUser, org_id)
        return Response()
    }

    // Remove all user org memberships managed by the organization account (both parent and managed organizations)
    private fun deleteUserMemberships(user: AccountUser, orgId: String) {
        val organizations = (listOf(orgId) + listManagedOrganizations(orgId).map { it.orgId }).toSet()
        membershipHandler.getUserMembershipsById(user.userId).forEach { membership ->
            if (organizations.contains(membership.orgId)) {
                membershipHandler.deleteOrganizationMembership(userEmail = user.email, membership.orgId)
            }
        }
    }

    @Operation(
        operationId = "ListManagedOrganizations",
        summary = "List managed organizations for a parent organization",
        description = "List managed organizations for a parent organization",
    )
    @Get(
        uri = "/organizations",
        produces = [MediaType.APPLICATION_JSON]
    )
    fun listManagedOrganizations(
        @Schema(example = DocUtils.ExampleOrgId) org_id: String,
    ): List<AccountOrganization> {
        return organizationDAO.listManagedOrganizations(org_id).map {
            it.toAccountOrganization()
        }
    }

    @Operation(
        operationId = "GetAccountMemberships",
        summary = "Get memberships in an account",
        description = "Get memberships in the account organization and any managed organizations",
    )
    @Get(
        uri = "/memberships",
        produces = [MediaType.APPLICATION_JSON]
    )
    fun getAccountMemberships(
        @Schema(example = DocUtils.ExampleOrgId) org_id: String,
        @Schema(example = DocUtils.ExampleUserId) @QueryValue user_id: String?,
        @Schema(example = DocUtils.ExampleOrgId) @QueryValue managed_org_id: String?,
        // schema with enumAsRef for ModelType does not compile; with example generates invalid type of object
        @QueryValue role: Role?,
    ): GetAccountMembershipsResponse {
        val organization = organizationDAO.getOrganization(org_id).toAccountOrganization()
        val managedOrganizations = organizationDAO.listManagedOrganizations(org_id).map { it.toAccountOrganization() }
        val allOrganizations = listOf(organization) + managedOrganizations
        val orgMemberships = allOrganizations
            .asSequence()
            .map { membershipHandler.listOrganizationMemberships(it.orgId) }
            .flatten()
            .filter { role == null || it.role == role }
            .filter { user_id == null || it.userId == user_id }
            .filter { managed_org_id == null || it.orgId == managed_org_id }

        val orgMembershipMap: Map<Pair<String, Role>, List<Membership>> = orgMemberships.groupBy { Pair(it.orgId, it.role) }
        // TODO include org/role combinations that have no members
        return GetAccountMembershipsResponse(
            orgMembershipMap.map { (key, memberships) ->
                OrganizationRoleMembers(
                    orgId = key.first, role = key.second,
                    members = memberships.map {
                        Member(userId = it.userId, email = it.email)
                    }
                )
            }
        )
    }

    @Operation(
        operationId = "PutOrganizationMemberships",
        summary = "Replace the memberships in a specific role and managed organization",
        description = "Replace all of the memberships in a specific role and managed organization",
    )
    @Put(
        uri = "/memberships",
        produces = [MediaType.APPLICATION_JSON]
    )
    fun putOrganizationMemberships(
        @Schema(example = DocUtils.ExampleOrgId) org_id: String,
        @Schema(example = DocUtils.ExampleOrgId) @QueryValue managed_org_id: String,
        @Schema(enumAsRef = true) @QueryValue role: Role,
        @Body request: PutAccountMembershipsRequest,
    ): StatusResponse {
        val errors = mutableListOf<ErrorStatus>()
        validateManagedOrg(org_id, managed_org_id)
        val memberships = membershipHandler.listOrganizationMemberships(managed_org_id)
        val existingMembers = memberships.map { it.userId }.toSet()
        request.userIds.forEach {
            val accountUser = accountUserDAO.getAccountUserById(orgId = org_id, userId = it)
            if (accountUser == null) {
                errors.add(ErrorStatus(HttpStatus.NOT_FOUND.code, it, "No account user exists for the provided user id."))
            }
            accountUser?.run {
                if (this.userId !in existingMembers) {
                    membershipHandler.createOrganizationMembership(
                        userEmail = this.email,
                        orgId = managed_org_id,
                        role = role,
                        createdBy = org_id,
                    )
                } else {
                    membershipHandler.updateOrganizationMembership(
                        userEmail = this.email,
                        orgId = managed_org_id,
                        role = role,
                    )
                }
            }
        }

        // Delete org memberships for users that are not on the list
        memberships.forEach { membership ->
            if (membership.userId !in request.userIds.toSet()) {
                membershipHandler.deleteOrganizationMembership(membership.email, managed_org_id)
            }
        }
        return StatusResponse(errors = errors)
    }

    @Operation(
        operationId = "PatchOrganizationMemberships",
        summary = "Add or delete memberships in a specific role and managed organization",
        description = "Add or delete all of the memberships in a specific role and managed organization",
    )
    @Patch(
        uri = "/memberships",
        produces = [MediaType.APPLICATION_JSON]
    )
    fun patchOrganizationMemberships(
        @Schema(example = DocUtils.ExampleOrgId) org_id: String,
        @Schema(example = DocUtils.ExampleOrgId) @QueryValue managed_org_id: String,
        @Schema(enumAsRef = true) @QueryValue role: Role,
        @Body request: PatchAccountMembershipsRequest,
    ): StatusResponse {
        val errors = mutableListOf<ErrorStatus>()
        validateManagedOrg(org_id, managed_org_id)
        request.userIdsToAdd.forEach { userId ->
            val accountUser = accountUserDAO.getAccountUserById(orgId = org_id, userId = userId)
            if (accountUser == null) {
                errors.add(ErrorStatus(HttpStatus.NOT_FOUND.code, userId, "No account user exists for the provided user id. Unable to add membership."))
            }
            accountUser?.run {
                try {
                    membershipHandler.updateOrganizationMembership(accountUser.email, managed_org_id, role)
                } catch (e: MembershipNotFoundException) {
                    membershipHandler.createOrganizationMembership(accountUser.email, managed_org_id, role)
                }
            }
        }
        request.userIdsToDelete.forEach { userId ->
            try {
                membershipHandler.deleteMembershipById(userId, managed_org_id)
            } catch (e: IllegalArgumentException) {
                errors.add(
                    ErrorStatus(
                        HttpStatus.NOT_FOUND.code,
                        userId,
                        "User is not a member of this organization. Unable to delete membership."
                    )
                )
            }
        }
        return StatusResponse(errors = errors)
    }

    private fun validateManagedOrg(orgId: String, managedOrgId: String) {
        if (orgId == managedOrgId) {
            return
        }
        val managedOrganizations = organizationDAO.listManagedOrganizations(orgId).map { it.id }.toSet()
        require(managedOrgId in managedOrganizations) {
            "Organization $managedOrgId is not a managed organization of $orgId"
        }
    }
}

fun OrganizationSummary.toAccountOrganization(): AccountOrganization {
    return AccountOrganization(orgId = id, name = name)
}

fun OrganizationMetadata.toAccountOrganization(): AccountOrganization {
    return AccountOrganization(orgId = id, name = name)
}

@Schema(description = "Request to create a user in an account", requiredProperties = ["email"])
data class CreateAccountUserRequest(
    @field:Schema(description = "The user's email address")
    val email: String,
    @field:Schema(description = "The external id the user is known by in the provisioner")
    val externalId: String?,
    val userSchema: String?,
    val active: Boolean? = true,
)

@Schema(description = "Request to update a user in an account", requiredProperties = ["email"])
data class UpdateAccountUserRequest(
    @field:Schema(description = "The external id the user is known by in the provisioner")
    val externalId: String?,
    val userSchema: String?,
    val active: Boolean? = true,
)

@Schema(description = "Response for the GetAccountMemberships API", requiredProperties = ["orgId"])
data class AccountOrganization(
    @field:Schema(description = "Organization ID")
    val orgId: String,
    @field:Schema(description = "Organization name")
    val name: String,
)

@Schema(description = "Response for the GetAccountMemberships API", requiredProperties = ["memberships"])
data class GetAccountMembershipsResponse(
    @field:ArraySchema(
        arraySchema = Schema(description = "A list of memberships in the account"),
        uniqueItems = true,
    )
    val memberships: List<OrganizationRoleMembers>,
)

@Schema(description = "Request for the PutAccountMemberships API", requiredProperties = ["userIds"])
data class PutAccountMembershipsRequest(
    @field:ArraySchema(
        arraySchema = Schema(description = "A list of userIds that should be members"),
    )
    val userIds: List<String>,
)

@Schema(description = "Request for the PatchAccountMemberships API", requiredProperties = ["userIdsToAdd", "userIdsToDelete"])
data class PatchAccountMembershipsRequest(
    @field:ArraySchema(
        arraySchema = Schema(description = "A list of userIds that should be members"),
    )
    val userIdsToAdd: List<String>,
    @field:ArraySchema(
        arraySchema = Schema(description = "A list of userIds that should not be members"),
    )
    val userIdsToDelete: List<String>,
)
