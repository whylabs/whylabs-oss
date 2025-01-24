package ai.whylabs.songbird.membership

import ai.whylabs.songbird.v0.ddb.Role

data class ClaimMembershipConfiguration(
    val connections: Map<String, ClaimMembershipRoleConfiguration>
)

data class ClaimMembershipRoleConfiguration(
    val memberships: Map<String, List<ClaimConfigurationMembership>>
)

data class ClaimConfigurationMembership(
    val orgId: String,
    val role: Role,
)
