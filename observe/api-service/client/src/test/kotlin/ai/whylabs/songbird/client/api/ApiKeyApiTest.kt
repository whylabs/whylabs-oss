package ai.whylabs.songbird.client.api

import ai.whylabs.songbird.client.model.SubscriptionTier
import ai.whylabs.songbird.util.expectClientFailure
import ai.whylabs.songbird.util.waitUntilCount
import ai.whylabs.songbird.util.withNewOrg
import ai.whylabs.songbird.util.withUser
import org.junit.jupiter.api.Assertions
import org.junit.jupiter.api.Test

class ApiKeyApiTest {

    @Test
    fun `creation fails after 25 keys in free orgs`() {
        withNewOrg { org ->
            withUser { user ->
                val targetCount = 25

                for (i in 1..targetCount) {
                    SongbirdClients.ApiKeyClient.createApiKey(org.id, user.userId, null, null, null)
                }

                waitUntilCount(targetCount) { SongbirdClients.ApiKeyClient.listApiKeys(org.id, user.userId).items.size }

                expectClientFailure(400) {
                    SongbirdClients.ApiKeyClient.createApiKey(org.id, user.userId, null, null, null)
                }
            }
        }
    }

    @Test
    fun `creation does not fail after 25 keys in paid orgs`() {
        withNewOrg(SubscriptionTier.PAID) { org ->
            withUser { user ->
                val targetCount = 25

                for (i in 1..targetCount) {
                    SongbirdClients.ApiKeyClient.createApiKey(org.id, user.userId, null, null, null)
                }

                waitUntilCount(targetCount) { SongbirdClients.ApiKeyClient.listApiKeys(org.id, user.userId).items.size }
                SongbirdClients.ApiKeyClient.createApiKey(org.id, user.userId, null, null, null)
            }
        }
    }

    @Test
    fun `creation includes the actual key`() {
        withNewOrg { org ->
            withUser { user ->
                val key = SongbirdClients.ApiKeyClient.createApiKey(org.id, user.userId, null, null, null)
                Assertions.assertNotNull(key.key)
            }
        }
    }

    @Test
    fun `listing for org id works`() {
        withNewOrg { org ->
            withUser { user ->
                val key = SongbirdClients.ApiKeyClient.createApiKey(org.id, user.userId, null, null, null)
                val keys = SongbirdClients.ApiKeyClient.listApiKeys(org.id, userId = null)

                val expectedKey = key.copy(key = null)
                Assertions.assertEquals(1, keys.items.size, "length")
                Assertions.assertEquals(expectedKey, keys.items.first(), "key")
            }
        }
    }

    @Test
    fun `getting a key works`() {
        withNewOrg { org ->
            withUser { user ->
                val key = SongbirdClients.ApiKeyClient.createApiKey(org.id, user.userId, null, null, null)
                val actual = SongbirdClients.ApiKeyClient.getApiKey(org.id, key.keyId).key
                Assertions.assertEquals(key.copy(key = null), actual)
            }
        }
    }

    @Test
    fun `listing for org id and user id  works`() {
        withNewOrg { org ->
            withUser { user ->
                val key = SongbirdClients.ApiKeyClient.createApiKey(org.id, user.userId, null, null, null)
                val keys = SongbirdClients.ApiKeyClient.listApiKeys(org.id, userId = user.userId)

                val expectedKey = key.copy(key = null)
                Assertions.assertEquals(1, keys.items.size, "length")
                Assertions.assertEquals(expectedKey, keys.items.first(), "key")
            }
        }
    }
}

