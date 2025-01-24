package ai.whylabs.songbird.client.api

import ai.whylabs.songbird.client.model.AddMembershipRequest
import ai.whylabs.songbird.client.model.CreateUserRequest
import ai.whylabs.songbird.client.model.RemoveMembershipRequest
import ai.whylabs.songbird.client.model.Role
import ai.whylabs.songbird.client.model.SetDefaultMembershipRequest
import ai.whylabs.songbird.client.model.SubscriptionTier
import ai.whylabs.songbird.client.model.UpdateMembershipRequest
import ai.whylabs.songbird.util.expectClientFailure
import ai.whylabs.songbird.util.waitUntilCondition
import ai.whylabs.songbird.util.waitUntilCount
import ai.whylabs.songbird.util.withMembership
import ai.whylabs.songbird.util.withNewOrg
import ai.whylabs.songbird.util.withUser
import org.junit.jupiter.api.Assertions
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.TestInstance
import java.util.UUID

@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class MembershipAPITest {
    private val client = SongbirdClients.MembershipClient
    private val userClient = SongbirdClients.UserClient

    @Test
    fun `creating memberships that exists fails`() {
        withNewOrg { org ->
            withUser { user ->
                withMembership(org.id, user.email) {
                    expectClientFailure(400) {
                        client.createMembership(AddMembershipRequest(orgId = org.id, email = user.email, role = Role.MEMBER, default = false))
                    }
                }
            }
        }
    }

    @Test
    fun `retrieving memberships by user id works`() {
        withNewOrg { org ->
            withUser { user ->
                withMembership(org.id, user.email) {
                    val response = client.getMemberships(user.userId, includeClaims = false)

                    Assertions.assertEquals(org.id, response.memberships.first().orgId)
                    Assertions.assertEquals(Role.MEMBER, response.memberships.first().role)
                    Assertions.assertEquals(user.userId, response.memberships.first().userId)
                    Assertions.assertEquals(user.email, response.memberships.first().email)
                }
            }
        }
    }

    @Test
    fun `retrieving memberships by email works`() {
        withNewOrg { org ->
            withUser { user ->
                withMembership(org.id, user.email) {
                    val response = client.getMembershipsByEmail(user.email, includeClaims = false)
                    Assertions.assertEquals(org.id, response.memberships.first().orgId)
                    Assertions.assertEquals(Role.MEMBER, response.memberships.first().role)
                    Assertions.assertEquals(user.userId, response.memberships.first().userId)
                    Assertions.assertEquals(user.email, response.memberships.first().email)
                }
            }
        }
    }

    @Test
    fun `retrieving memberships by org works`() {
        withNewOrg { org ->
            withUser { user ->
                withMembership(org.id, user.email) {
                    val memberships = client.getMembershipsByOrg(org.id, includeClaims = false)
                    val response = memberships.memberships.find { it.userId == user.userId }
                    Assertions.assertEquals(org.id, response?.orgId)
                    Assertions.assertEquals(Role.MEMBER, response?.role)
                    Assertions.assertEquals(user.userId, response?.userId)
                    Assertions.assertEquals(user.email, response?.email)
                }
            }
        }
    }

    @Test
    fun `updating default membership works`() {
        // TODO: once there's ability to Delete orgs, create an org here and a membership to go along with it, then delete it at the end of the test
    }

    @Test
    fun `cannot set default membership to non-existent org`() {
        expectClientFailure(404) {
            withNewOrg { org ->
                withUser { user ->
                    withMembership(org.id, user.email) {
                        client.setDefaultMembership(SetDefaultMembershipRequest(orgId = "some fake org", userId = user.userId))
                    }
                }
            }
        }
    }

    @Test
    fun `cannot set default membership to org that the user is not a member of`() {
        withNewOrg { org ->
            withUser { user ->
                expectClientFailure(404) {
                    client.setDefaultMembership(SetDefaultMembershipRequest(orgId = org.id, userId = user.userId))
                }
            }
        }
    }

    @Test
    fun `cannot set default membership for a user that does not exist`() {
        expectClientFailure(404) {
            withNewOrg { org ->
                client.setDefaultMembership(SetDefaultMembershipRequest(orgId = org.id, userId = "some fake user"))
            }
        }
    }

    @Test
    fun `cannot add user from different domain than what is specified on Enterprise org`() {
        expectClientFailure(400) {
            withUser { user ->
                withNewOrg(SubscriptionTier.PAID, "some-random-domain.com") { org ->
                    client.createMembership(AddMembershipRequest(orgId = org.id, email = user.email, role = Role.MEMBER))
                }
            }
        }
    }

    @Test
    fun `can add user from different domain than what is specified on Self-serve org`() {
        withUser { user ->
            withNewOrg(SubscriptionTier.FREE, "some-random-domain.com") { org ->
                client.createMembership(AddMembershipRequest(orgId = org.id, email = user.email, role = Role.MEMBER))
            }
        }
    }

    @Test
    fun `can add user from random domain if domain not specified on org`() {
        withUser { user ->
            withNewOrg(SubscriptionTier.PAID, "") { org ->
                client.createMembership(AddMembershipRequest(orgId = org.id, email = user.email, role = Role.MEMBER))
            }
        }
    }

    @Test
    fun `can add user from random domain if domain is null on org`() {
        withUser { user ->
            withNewOrg(SubscriptionTier.PAID, null) { org ->
                client.createMembership(AddMembershipRequest(orgId = org.id, email = user.email, role = Role.MEMBER))
            }
        }
    }

    @Test
    fun `memberships capped at 25`() {
        withNewOrg { org ->
            val targetCount = 25

            for (i in 1..targetCount) {
                val email = "foo+${UUID.randomUUID()}@whylabs.ai"
                val user = userClient.createUser(CreateUserRequest(email = email))
                waitUntilCount(1) { userClient.getUser(user.userId).let { 1 } } // Wait for GSI update
                client.createMembership(AddMembershipRequest(orgId = org.id, email = user.email, role = Role.MEMBER, default = true))
            }

            waitUntilCount(targetCount) { SongbirdClients.MembershipClient.getMembershipsByOrg(org.id, includeClaims = false).memberships.size }

            expectClientFailure(400) {
                val email = "foo+${UUID.randomUUID()}@whylabs.ai"
                val user = userClient.createUser(CreateUserRequest(email = email))
                waitUntilCount(1) { userClient.getUser(user.userId).let { 1 } } // Wait for GSI update
                client.createMembership(AddMembershipRequest(orgId = org.id, email = user.email, role = Role.MEMBER, default = true))
            }
        }
    }

    @Test
    fun `memberships not capped at 25 for paid`() {
        withNewOrg(SubscriptionTier.PAID) { org ->
            val targetCount = 25

            for (i in 1..targetCount) {
                val email = "foo+${UUID.randomUUID()}@whylabs.ai"
                val user = userClient.createUser(CreateUserRequest(email = email))
                waitUntilCount(1) { userClient.getUser(user.userId).let { 1 } } // Wait for GSI update
                client.createMembership(AddMembershipRequest(orgId = org.id, email = user.email, role = Role.MEMBER, default = true))
            }

            waitUntilCount(targetCount) { SongbirdClients.MembershipClient.getMembershipsByOrg(org.id, includeClaims = false).memberships.size }

            val email = "foo+${UUID.randomUUID()}@whylabs.ai"
            val user = userClient.createUser(CreateUserRequest(email = email))
            waitUntilCount(1) { userClient.getUser(user.userId).let { 1 } } // Wait for GSI update
            client.createMembership(AddMembershipRequest(orgId = org.id, email = user.email, role = Role.MEMBER, default = true))
        }
    }

    @Test
    fun `getDefaultMembershipForEmail is not case sensitive`() {
        withNewOrg { org ->
            withUser { user ->
                val originalEmail = user.email
                val originalMembership = client.createMembership(AddMembershipRequest(
                        orgId = org.id,
                        email = originalEmail,
                        role = Role.MEMBER,
                        default = true
                ))
                waitUntilCount(1) { client.getMemberships(user.userId, includeClaims = false).let { 1 }}
                val upperCaseEmail = originalEmail.uppercase()
                val upperCaseMembership = client.getDefaultMembershipForEmail(upperCaseEmail)
                Assertions.assertEquals(originalMembership.orgId, upperCaseMembership.membership?.orgId)
                Assertions.assertEquals(originalMembership.userId, upperCaseMembership.membership?.userId)
            }
        }
    }

    @Test
    fun `getMembershipsByEmail is not case sensitive`() {
        withNewOrg { org ->
            withUser { user ->
                val originalEmail = user.email
                val originalMembership = client.createMembership(AddMembershipRequest(
                        orgId = org.id,
                        email = originalEmail,
                        role = Role.MEMBER,
                        default = true
                ))
                waitUntilCount(1) { client.getMemberships(user.userId, includeClaims = false).let { 1 }}
                val upperCaseEmail = originalEmail.uppercase()
                val upperCaseMemberships = client.getMembershipsByEmail(upperCaseEmail, includeClaims = false)
                Assertions.assertEquals(upperCaseMemberships.memberships.size, 1)
                val upperCaseMembership = upperCaseMemberships.memberships.first()
                Assertions.assertEquals(originalMembership.orgId, upperCaseMembership.orgId)
                Assertions.assertEquals(originalMembership.userId, upperCaseMembership.userId)
            }
        }
    }

    @Test
    fun `createMembership is not case sensitive`() {
        withNewOrg { org ->
            withUser { user ->
                val originalEmail = user.email
                client.createMembership(AddMembershipRequest(
                        orgId = org.id,
                        email = originalEmail,
                        role = Role.MEMBER,
                        default = true
                ))
                waitUntilCount(1) { client.getMemberships(user.userId, includeClaims = false).let { 1 }}
                val upperCaseEmail = originalEmail.uppercase()
                expectClientFailure(400) {
                    client.createMembership(AddMembershipRequest(
                            orgId = org.id,
                            email = upperCaseEmail,
                            role = Role.MEMBER,
                            default = true
                    ))
                }
            }
        }
    }

    @Test
    fun `removeMembershipByEmail is not case sensitive`() {
        withNewOrg { org ->
            withUser { user ->
                val originalEmail = user.email
                client.createMembership(AddMembershipRequest(
                        orgId = org.id,
                        email = originalEmail,
                        role = Role.MEMBER,
                        default = true
                ))
                waitUntilCount(1) { client.getMemberships(user.userId, includeClaims = false).let { 1 }}
                val upperCaseEmail = originalEmail.uppercase()
                client.removeMembershipByEmail(RemoveMembershipRequest(org.id, upperCaseEmail))
                waitUntilCount(0) { client.getMemberships(user.userId, includeClaims = false).let { m -> m.memberships.size } }
            }
        }
    }

    @Test
    fun `updateMembership is not case sensitive`() {
        withNewOrg { org ->
            withUser { user ->
                val originalEmail = user.email
                client.createMembership(AddMembershipRequest(
                    orgId = org.id,
                    email = originalEmail,
                    role = Role.MEMBER,
                    default = true
                ))
                waitUntilCount(1) { client.getMemberships(user.userId, includeClaims = false).let { 1 }}
                val upperCaseEmail = originalEmail.uppercase()
                client.updateMembershipByEmail(UpdateMembershipRequest(org.id, upperCaseEmail, Role.VIEWER))
                waitUntilCondition({ client.getMemberships(user.userId, includeClaims = false).let { m -> m.memberships[0].role == Role.VIEWER } }, "Role not updated")
            }
        }
    }

    @Test
    fun `default membership is stable when no membership is marked default but some exist`() {
        val email = "foo+${UUID.randomUUID()}@whylabs.ai"
        val user = userClient.createUser(CreateUserRequest(email = email))
        println("Generated email $email and user id ${user.userId}")

        withNewOrg { org1 ->
            withNewOrg { org2 ->
                println("Org 1 is ${org1.id}")
                println("Org 2 is ${org2.id}")

                // Neither marked as default
                client.createMembership(AddMembershipRequest(orgId = org1.id, email = user.email, role = Role.MEMBER, default = false))
                client.createMembership(AddMembershipRequest(orgId = org2.id, email = user.email, role = Role.MEMBER, default = false))

                // Default is picked by sorting all memberships by org id and picking the first.
                val expectedOrgId = listOf(org1.id, org2.id).minOrNull()

                val default = client.getDefaultMembershipForEmail(email)
                Assertions.assertEquals(expectedOrgId, default.membership?.orgId)
            }
        }
    }
}
