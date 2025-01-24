package ai.whylabs.songbird.monitor

import ai.whylabs.songbird.EnvironmentConfig
import ai.whylabs.songbird.EnvironmentVariable
import ai.whylabs.songbird.logging.JsonLogging
import ai.whylabs.songbird.util.DownloadType
import ai.whylabs.songbird.util.S3DownloadParams
import com.amazonaws.services.s3.AmazonS3
import com.amazonaws.services.s3.iterable.S3Objects
import com.amazonaws.services.s3.model.S3ObjectSummary
import io.swagger.v3.oas.annotations.media.Schema
import jakarta.inject.Inject
import jakarta.inject.Singleton

@Singleton
class MonitorConfigVersions @Inject constructor(
    private val environmentConfig: EnvironmentConfig,
    private val s3: AmazonS3,
) : JsonLogging {
    fun loadVersions(orgId: String, datasetId: String): List<MonitorConfigVersion> {
        val bucket = environmentConfig.getEnv(EnvironmentVariable.StorageBucket)
        val prefix = "$HistoryPrefix$orgId/$datasetId/"
        return S3Objects.withPrefix(s3, bucket, prefix)
            .sortedBy { it.lastModified.time }
            .map { MonitorConfigVersion.from(it) }
    }

    private fun downloadVersion(config: MonitorConfigVersion): String {
        val bucket = environmentConfig.getEnv(EnvironmentVariable.StorageBucket)
        val downloadParams = S3DownloadParams(
            bucket = bucket,
            key = config.path,
            downloadType = DownloadType.MonitorConfigHistory,
            logger = log,
        )
        return downloadParams.download(s3)
    }

    fun getVersion(orgId: String, datasetId: String, versionId: String): String {
        val obj = loadVersions(orgId, datasetId)
            .filter { it.versionId == versionId }

        if (obj.isEmpty()) {
            throw IllegalArgumentException("Monitor config version is not available.")
        }

        return downloadVersion(obj.last())
    }

    companion object {
        const val HistoryPrefix = "monitor-config-history/"
    }
}

data class MonitorConfigVersion(
    @Schema(description = "Version storage path", example = "path/to/version/history")
    val path: String,
    @Schema(description = "Version identifier for the monitor config", example = "59da317c9be80d92d")
    val versionId: String,
    @Schema(description = "Update timestamp in milliseconds", example = "1234567890123")
    val lastModified: Long
) {
    companion object {
        fun from(s3ObjectSummary: S3ObjectSummary): MonitorConfigVersion {
            return MonitorConfigVersion(
                path = s3ObjectSummary.key,
                versionId = s3ObjectSummary.eTag,
                lastModified = s3ObjectSummary.lastModified.time
            )
        }
    }
}
