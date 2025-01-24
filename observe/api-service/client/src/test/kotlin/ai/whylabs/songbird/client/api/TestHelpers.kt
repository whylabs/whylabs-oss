package ai.whylabs.songbird.client.api

import ai.whylabs.songbird.client.model.LogResponse
import ai.whylabs.songbird.client.model.SegmentTag
import com.whylogs.core.DatasetProfile
import java.io.ByteArrayOutputStream
import java.io.File
import java.time.Instant

fun uploadDatasetProfile(
    logApi: LogApi,
    sessionTimestamp: Instant,
): LogResponse {

    // Create a dummy dataset profile for upload
    val profile = DatasetProfile("test-session", sessionTimestamp, mapOf("tag" to "tagValue"))
    profile.track(
        mapOf(
            "feature_1" to 1,
            "feature_2" to "text",
            "feature_3" to 3.0
        )
    )

    // Write it to a "file"
    val inputStream = ByteArrayOutputStream()
    profile.toProtobuf().build().writeDelimitedTo(inputStream)

    val file = File.createTempFile("data", ".bin")
    try {
        file.outputStream().use {
            profile.toProtobuf().build().writeDelimitedTo(it)
        }
        return logApi.log(
            orgId = DemoSandboxOrg,
            modelId = HardcodedSandboxModel,
            file = file,
            datasetTimestamp = null,
            segmentTags = listOf(SegmentTag("foo", "bar")),
            segmentTagsJson = null
        )
    } finally {
        file.delete()
    }
}