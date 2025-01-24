package ai.whylabs.songbird.client.api

import ai.whylabs.songbird.client.infrastructure.ClientException
import ai.whylabs.songbird.client.model.CreateUserRequest
import ai.whylabs.songbird.client.model.User
import ai.whylabs.songbird.util.withMembership
import org.apache.http.HttpStatus
import org.junit.jupiter.api.Assertions
import org.junit.jupiter.api.Test

private const val IntegrationTestUserEmail = "feature-flag-test-user@whylabs.ai"
private const val FeatureFlagsTestOrg = "org-0"
private const val TestFeatureFlag = "integration-test-flag"

class FeatureFlagsApiTest {
    private val client = SongbirdClients.FeatureFlagsClient

    private fun getOrCreateTestUser(): User {
        return try {
            SongbirdClients.UserClient.getUserByEmail(IntegrationTestUserEmail)
        } catch (e: ClientException) {
            when (e.statusCode) {
                HttpStatus.SC_NOT_FOUND -> null
                else -> throw e
            }
        } ?: SongbirdClients.UserClient.createUser(CreateUserRequest(email = IntegrationTestUserEmail))
    }

    @Test
    fun `fetching feature flags works even if user doesn't exist`() {
        val res = client.getFeatureFlags("some-random-user-id", "non-existent-org")
        Assertions.assertEquals(res.flagValues.isNotEmpty(), true)
    }

    @Test
    fun `sample flag should be off for users other than integ test user`() {
        val res = client.getFeatureFlags("some-random-user-id", "non-existent-org")

        val testFlagValue = res.flagValues.entries.find { it.key == TestFeatureFlag }?.value
        Assertions.assertEquals(testFlagValue, false)
    }

    @Test
    fun `fetching feature flags works for users that exist and belong to an org`() {
        val user = getOrCreateTestUser()

        withMembership(FeatureFlagsTestOrg, user.email) {
            val res = client.getFeatureFlags(user.userId, FeatureFlagsTestOrg)
            Assertions.assertEquals(res.flagValues.isNotEmpty(), true)
        }
    }

    @Test
    fun `sample flag should be on for integ test user`() {
        val user = getOrCreateTestUser()

        withMembership(FeatureFlagsTestOrg, user.email) {
            val res = client.getFeatureFlags(user.userId, FeatureFlagsTestOrg)

            val testFlagValue = res.flagValues.entries.find { it.key == TestFeatureFlag }?.value
            Assertions.assertEquals(testFlagValue, true)
        }
    }
}
