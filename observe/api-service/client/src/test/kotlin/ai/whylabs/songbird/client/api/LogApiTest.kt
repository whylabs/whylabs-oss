package ai.whylabs.songbird.client.api

import ai.whylabs.songbird.client.infrastructure.ClientException
import ai.whylabs.songbird.client.model.LogAsyncRequest
import ai.whylabs.songbird.client.model.LogReferenceRequest
import ai.whylabs.songbird.util.assertThrows
import ai.whylabs.songbird.util.expectClientFailure
import ai.whylabs.songbird.util.withNewOrg
import com.whylogs.core.DatasetProfile
import java.net.HttpURLConnection
import java.net.URL
import java.time.Instant
import org.junit.jupiter.api.Test

/**
 * Hardcoded test org for this suite. Only this suite should use this test org to avoid test
 * and people stepping on each other's and CIs toes. This test is the one test that shouldn't
 * just create its own resources because it actually logs data, which means that it will end
 * up getting consumed by druid.
 */
private const val IntegrationTestOrg = "org-9758"

class LogApiTest {
    private val client = SongbirdClients.LogClient

    @Test
    fun `logAsync() fails if org doesn't exist`() {
        val modelId = "model-1"
        val startTime = Instant.now().toEpochMilli()

        assertThrows<ClientException> {
            client.logAsync("fake-org", modelId, LogAsyncRequest(startTime, emptyList()))
        }

    }

    @Test
    fun `logAsync() fails if model doesn't exist`() {
        val modelId = "fake-model"
        val startTime = Instant.now().toEpochMilli()

        withNewOrg { org ->
            assertThrows<ClientException> {
                client.logAsync(org.id, modelId, LogAsyncRequest(startTime, emptyList()))
            }
        }
    }

    @Test
    fun `logAsync successfully uploads profiles`() {
        val modelId = "model-1"
        val startTime = Instant.now().toEpochMilli()

        // Create a profile
        val profile = DatasetProfile(
            "123",
            Instant.ofEpochMilli(1),
            Instant.ofEpochMilli(2),
            mapOf("column1" to "value1", "column2" to "value2"),
            mapOf()
        )

        // log a bunch of stuff
        for (i in (0..1000)) {
            profile.track("column1", i)
            profile.track("column2", i * 2)
        }

        val response =
            client.logAsync(IntegrationTestOrg, modelId, LogAsyncRequest(startTime, emptyList()))
        uploadToUrl(response.uploadUrl, profile)
    }

    @Test
    fun `logAsync can upload profiles with different extension`() {
        val modelId = "model-1"
        val startTime = Instant.now().toEpochMilli()

        // Create a profile
        val profile = DatasetProfile(
            "123",
            Instant.ofEpochMilli(1),
            Instant.ofEpochMilli(2),
            mapOf("column1" to "value1", "column2" to "value2"),
            mapOf()
        )

        // log a bunch of stuff
        for (i in (0..1000)) {
            profile.track("column1", i)
            profile.track("column2", i * 2)
        }

        val response =
            client.logAsync(IntegrationTestOrg, modelId, LogAsyncRequest(startTime, emptyList()))
        uploadToUrl(response.uploadUrl, profile, fileExtension = "zip")
    }

    @Test
    fun `logReference successfully uploads profiles`() {
        val modelId = "model-1"
        val now = Instant.now()
        val startTime = now.toEpochMilli()

        // Create a profile
        val profile = DatasetProfile(
            "123",
            Instant.now(),
            now,
            mapOf("column1" to "value1", "column2" to "value2"),
            mapOf()
        )

        // log a bunch of stuff
        for (i in (0..1000)) {
            profile.track("column1", i)
            profile.track("column2", i * 2)
        }

        val response =
            client.logReference(
                IntegrationTestOrg,
                modelId,
                LogReferenceRequest(datasetTimestamp = startTime)
            )

        // delay a bit for the item to show up in DDB
        Thread.sleep(2 * 1000)

        // should not return ref item if the file is not uploaded
        expectClientFailure(404) {
            SongbirdClients.DatasetProfileClient.getReferenceProfile(IntegrationTestOrg,
                modelId,
                response.id)
        }

        uploadToUrl(response.uploadUrl, profile)

        // should succeed if the file is uploaded
        SongbirdClients.DatasetProfileClient.getReferenceProfile(
            IntegrationTestOrg,
            modelId,
            response.id)

        // delete the profile
        val res = SongbirdClients.DatasetProfileClient.deleteReferenceProfile(
            IntegrationTestOrg,
            modelId,
            response.id)
        assert(res) { "Should delete successfully" }

        // sleep for eventual consistency
        Thread.sleep(1000)

        // assert that the profile is deleted
        expectClientFailure(404) {
            SongbirdClients.DatasetProfileClient.getReferenceProfile(IntegrationTestOrg,
                modelId,
                response.id)
        }
    }
}

private fun uploadToUrl(url: String, profile: DatasetProfile, fileExtension: String = "") {
    val connection = URL(url).openConnection() as HttpURLConnection
    connection.doOutput = true
    connection.setRequestProperty("Content-Type", "application/octet-stream")
    connection.setRequestProperty("X_WHYLABS_FILE_EXTENSION", fileExtension)
    connection.requestMethod = "PUT"

    connection.outputStream.use { out ->
        profile.toProtobuf().build().writeTo(out)
    }

    if (connection.responseCode != 200) {
        throw RuntimeException("Error uploading profile: ${connection.responseCode} ${connection.responseMessage}")
    }
}