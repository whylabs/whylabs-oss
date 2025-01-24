package ai.whylabs.songbird.client.api

import java.time.Instant
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class UploadApiTest {

    private val logClient = SongbirdClients.LogClient

    @Test
    fun `assert uploading new dataset profiles works`() {
        // Upload a data batch profile
        val sessionTimestamp = Instant.now()
        val uploadResponse = uploadDatasetProfile(logClient, sessionTimestamp)

        assertNotNull(uploadResponse)
        assertNotNull(uploadResponse.id)
        assertEquals(HardcodedSandboxModel, uploadResponse.modelId)
        assertTrue(uploadResponse.uploadTimestamp > 0)
    }
}