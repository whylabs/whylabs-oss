package ai.whylabs.songbird.client.api

import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test


class InternalApiTest {
    private val client = SongbirdClients.InternalApiClient

    @Test
    fun `assert listing organizations`() {
        val organization = client.listOrganizations().items
        assertTrue(organization.isNotEmpty(), "Should get back at least one organization.")
        // assertTrue(
        //     organization.contains(hardcodedSandboxOrg),
        //     "Should at least get back our hard coded sandbox org"
        // )
    }
}
