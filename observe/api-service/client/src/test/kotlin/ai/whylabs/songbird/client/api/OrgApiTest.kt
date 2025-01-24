package ai.whylabs.songbird.client.api

import ai.whylabs.songbird.util.expectClientFailure
import ai.whylabs.songbird.util.withNewOrg
import org.junit.jupiter.api.Assertions
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.TestInstance
import kotlin.random.Random

@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class OrgApiTest {
    private val client = SongbirdClients.OrgClient

    @Test
    fun `org can be described`() {
        withNewOrg { integrationTestOrg ->
            val response = client.getOrganization(integrationTestOrg.id)
            Assertions.assertEquals(integrationTestOrg.id, response.id, "org id")
        }
    }

    @Test
    fun `org can be partially updated`() {
        withNewOrg { integrationTestOrg ->
            val newDomain = "domain-${Random.nextInt().toShort()}"
            client.partiallyUpdateOrganization(
                integrationTestOrg.id,
                null,
                null,
                newDomain,
                null,
                null,
                null,
                null,
                null,
                null,
            )

            val response = client.getOrganization(integrationTestOrg.id)
            Assertions.assertEquals(newDomain, response.emailDomains, "org name")
        }
    }

    @Test
    fun `deleted orgs can't be read, deleted, or updated`() {
        val org = withNewOrg { }
        expectClientFailure(404, "getOrganization") {
            client.getOrganization(org.id)
        }

        expectClientFailure(404, "deleteOrganization") {
            client.deleteOrganization(org.id)
        }

        expectClientFailure(404, "partiallyUpdateOrganization") {
            client.partiallyUpdateOrganization(
                org.id,
                null,
                null,
                "domain",
                null,
                null,
                null,
                null,
                null,
                null,
            )
        }
    }

    @Test
    fun `org can be created`() {
        val newName = "Integration test created org"
        withNewOrg(name = newName) {
            val response = client.getOrganization(it.id)
            Assertions.assertEquals(newName, response.name, "org name")
        }
    }

    @Test
    fun `orgs can be listed`() {
        val orgs = client.listOrganizations()
        Assertions.assertTrue(orgs.items.isNotEmpty(), "org name")
    }
}