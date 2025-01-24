package ai.whylabs.songbird.util

import ai.whylabs.dataservice.model.Granularity
import ai.whylabs.songbird.EnvironmentConfig
import io.mockk.every
import io.mockk.mockk
import org.junit.jupiter.api.Assertions
import org.junit.jupiter.api.Test

private const val endpoint = "http://localhost:8080"

class ObservatoryLinksTest {

    @Test
    fun `test urls correct`() {
        val config = mockk<EnvironmentConfig>()
        every { config.getEnv(any(), any()) } returns endpoint
        val observatoryLinks = ObservatoryLinks(config)

        val time = 1689116254000L // Tuesday, July 11, 2023 10:57:34 PM GMT

        val url = observatoryLinks.profileViewerLink(
            "datasetId",
            listOf(ProfileId.ReferenceId("referenceId"), ProfileId.BatchProfileTimestamp(time, Granularity.DAILY))
        )

        Assertions.assertEquals(
            "$endpoint/resources/datasetId/profiles?profile=referenceId&profile=${
            time.truncate(
                Granularity.DAILY
            )
            }",
            url
        )
    }

    @Test
    fun `test max 3 profiles`() {
        val config = mockk<EnvironmentConfig>()
        every { config.getEnv(any(), any()) } returns endpoint
        val observatoryLinks = ObservatoryLinks(config)

        val url = observatoryLinks.profileViewerLink(
            "datasetId",
            listOf(
                ProfileId.ReferenceId("referenceId1"),
                ProfileId.ReferenceId("referenceId2"),
                ProfileId.ReferenceId("referenceId3"),
                ProfileId.ReferenceId("referenceId4"), // this one gets left out
            )
        )

        Assertions.assertEquals(
            "$endpoint/resources/datasetId/profiles?profile=referenceId1&profile=referenceId2&profile=referenceId3",
            url
        )
    }

    @Test
    fun `test min 1 profile`() {
        val config = mockk<EnvironmentConfig>()
        every { config.getEnv(any(), any()) } returns endpoint
        val observatoryLinks = ObservatoryLinks(config)

        Assertions.assertThrows(IllegalArgumentException::class.java) {
            observatoryLinks.profileViewerLink("datasetId", listOf())
        }
    }

    @Test
    fun `test urls correct for session`() {
        val config = mockk<EnvironmentConfig>()
        every { config.getEnv(any(), any()) } returns endpoint
        val observatoryLinks = ObservatoryLinks(config)
        val sessionId = "sessionId"

        val time = 1689116254000L // Tuesday, July 11, 2023 10:57:34 PM GMT

        val url = observatoryLinks.profileViewerLink(
            "datasetId",
            listOf(ProfileId.ReferenceId("referenceId"), ProfileId.BatchProfileTimestamp(time, Granularity.DAILY)),
            sessionId
        )

        Assertions.assertEquals(
            "$endpoint/resources/datasetId/profiles?profile=referenceId&profile=${
            time.truncate(
                Granularity.DAILY
            )
            }&sessionToken=$sessionId",
            url
        )
    }
}
