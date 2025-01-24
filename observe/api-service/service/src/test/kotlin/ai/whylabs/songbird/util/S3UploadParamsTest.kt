package ai.whylabs.songbird.util

import ai.whylabs.songbird.EnvironmentConfig
import ai.whylabs.songbird.EnvironmentVariable
import com.amazonaws.services.s3.AmazonS3
import io.kotest.matchers.string.shouldEndWith
import io.kotest.matchers.string.shouldStartWith
import io.mockk.every
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.mockk
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.TestInstance
import org.junit.jupiter.api.extension.ExtendWith
import java.io.ByteArrayInputStream
import java.time.Instant
import java.time.ZoneOffset
import java.time.ZonedDateTime

@TestInstance(TestInstance.Lifecycle.PER_CLASS)
@ExtendWith(MockKExtension::class)

internal class S3UploadParamsTest {
    @RelaxedMockK
    private lateinit var s3: AmazonS3

    @Test
    fun `upload daily log to S3 with correct path`() {
        val ts = ZonedDateTime.of(2021, 5, 21, 0, 0, 0, 0, ZoneOffset.UTC).toInstant()
        val config = mockk<EnvironmentConfig>(relaxed = true)

        every { config.getEnv(EnvironmentVariable.StorageBucketUntrustedPrefix) }.returns(EnvironmentVariable.StorageBucketUntrustedPrefix.value)

        val params = S3UploadParams(
            bucket = "demo",
            orgId = "org-0",
            modelId = "model-1",
            datasetTimestamp = ts.toEpochMilli(),
            uploadType = UploadType.DailyLogEntry,
            uploadContent = UploadContent.InputStreamContent(ByteArrayInputStream(ByteArray(10))),
            config = config
        )
        val res = params.upload(s3)
        res.key.shouldStartWith("daily-log/${Instant.now().toDateString()}/org-0-model-1-")
        res.key.shouldEndWith(".bin")
    }
}
