package ai.whylabs.songbird.client.api

import ai.whylabs.songbird.client.infrastructure.ClientException
import ai.whylabs.songbird.client.model.ProvisionNewUserRequest
import ai.whylabs.songbird.client.model.SubscriptionTier
import ai.whylabs.songbird.client.model.User
import ai.whylabs.songbird.util.expectClientFailure
import ai.whylabs.songbird.util.withNewOrg
import ai.whylabs.songbird.util.withUser
import java.util.UUID
import kotlinx.coroutines.runBlocking
import org.junit.jupiter.api.Assertions
import org.junit.jupiter.api.Test

class ProvisionApiTest {
    private val client = SongbirdClients.ProvisionClient

    @Test
    fun `provisioning a new user works`() {
        val email = "provision-user-test-${UUID.randomUUID()}@whylabs.ai"
        val response = client.provisionNewUser(
            ProvisionNewUserRequest(
                email = email,
                subscriptionTier = SubscriptionTier.FREE,
                orgName = "org name",
                modelName = "model name"
            )
        )

        // Org should exist
        val org = SongbirdClients.OrgClient.getOrganization(response.orgId)
        Assertions.assertEquals(response.orgId, org.id, "org id")
        Assertions.assertEquals("org name", org.name, "org name")

        val model = SongbirdClients.ModelsApiClient.getModel(response.orgId, response.modelId)
        Assertions.assertEquals(response.modelId, model.id, "model id")
        Assertions.assertEquals("model name", model.name, "model name")

        // User should be a member of the org
        val memberships = SongbirdClients.MembershipClient.getMemberships(response.userId, includeClaims = false)
        val hasMembership = memberships.memberships.any { it.orgId == response.orgId }
        Assertions.assertTrue(hasMembership, "user has membership in org")

        // User metadata set correctly
        val user = SongbirdClients.UserClient.getUser(response.userId)
        Assertions.assertEquals(email, user.email, "user email")
    }

    @Test
    fun `email duplicate rejected`() {
        val email = "duplicate-email-test-${UUID.randomUUID()}@whylabs.ai"
        client.provisionNewUser(
            ProvisionNewUserRequest(
                email = email,
                subscriptionTier = SubscriptionTier.FREE,
                orgName = "org name",
                modelName = "model name"
            )
        )
        expectClientFailure(400) {
            client.provisionNewUser(
                ProvisionNewUserRequest(
                    email = email,
                    subscriptionTier = SubscriptionTier.FREE,
                    orgName = "org name",
                    modelName = "model name"
                )
            )
        }
    }

    @Test
    fun `provisioning is case insensitive`() {
        withUser { user ->
            client.provisionNewUser(
                ProvisionNewUserRequest(
                    email = user.email,
                    subscriptionTier = SubscriptionTier.FREE,
                    orgName = "org name",
                    modelName = "model name",
                    expectExisting = true,
                )
            )
            expectClientFailure(400) {
                val upperCaseEmail = user.email.uppercase()
                client.provisionNewUser(
                    ProvisionNewUserRequest(
                        email = upperCaseEmail,
                        subscriptionTier = SubscriptionTier.FREE,
                        orgName = "org name",
                        modelName = "model name",
                        expectExisting = false,
                    )
                )
            }
        }
    }

    @Test
    fun `provisioning fails if user expected to exist, but doesn't`() {
        expectClientFailure(400) {
            val email = "email-test-${UUID.randomUUID()}@whylabs.ai"
            client.provisionNewUser(
                ProvisionNewUserRequest(
                    email = email,
                    subscriptionTier = SubscriptionTier.FREE,
                    orgName = "org name",
                    modelName = "model name",
                    expectExisting = true,
                )
            )
        }
    }
}