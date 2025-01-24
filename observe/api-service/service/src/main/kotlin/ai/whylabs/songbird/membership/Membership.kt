package ai.whylabs.songbird.membership

import ai.whylabs.songbird.v0.ddb.Role
import io.swagger.v3.oas.annotations.media.Schema

@Schema(description = "Response for the get memberships", requiredProperties = ["orgId", "role", "userId", "email"])
data class Membership(
    val orgId: String,
    val default: Boolean,
    val role: Role,
    val userId: String,
    val email: String
)

@Schema(description = "Memberships by organization and role", requiredProperties = ["userId", "email"])
data class Member(
    val userId: String,
    val email: String
)
@Schema(description = "Memberships by organization and role", requiredProperties = ["orgId", "role", "members"])
data class OrganizationRoleMembers(
    val orgId: String,
    val role: Role,
    val members: List<Member>
)
